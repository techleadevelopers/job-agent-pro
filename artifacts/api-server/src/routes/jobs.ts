import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ProviderManager } from "../services/discovery/provider-manager";
import { computeMatchScore } from "../services/matching.service";
import { getCandidateProfile, getResumeForUser } from "../services/profile.service";
import { getUserId } from "../services/user.service";
import { logger } from "../lib/logger";

const router = Router();
const providerManager = new ProviderManager();

function generateCoverLetter(name: string, title: string, company: string, skills: string[], country: string): string {
  const topSkills = skills.slice(0, 4).join(", ");
  const isEU = ["ES", "PT", "EU"].includes(country);
  if (isEU) {
    return `Olá equipe ${company},\n\nEstou a candidatar-me à posição de ${title}. Tenho sólida experiência com ${topSkills}, competências diretamente alinhadas com os requisitos.\n\nFico ao dispor para uma conversa.\n\nCom os melhores cumprimentos,\n${name}`;
  }
  return `Olá equipe ${company},\n\nEstou muito interessado na vaga de ${title}. Tenho sólida experiência com ${topSkills}, diretamente alinhadas com os requisitos.\n\nEstou animado com a possibilidade de contribuir com a ${company}.\n\nAtenciosamente,\n${name}`;
}

function matchesLocationFilter(country: string, filter: string): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "EU") return ["ES", "PT", "EU"].includes(country);
  return country === filter.toUpperCase();
}

router.get("/jobs", async (req, res) => {
  const { status, search, minMatch, country } = req.query;
  let rows = await db.select().from(jobsTable);
  rows = rows.sort((a, b) => b.match_score - a.match_score);
  if (status && status !== "all") rows = rows.filter(j => j.status === status);
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    rows = rows.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
  }
  if (minMatch) rows = rows.filter(j => j.match_score >= parseInt(minMatch as string, 10));
  if (country && typeof country === "string" && country !== "all") {
    rows = rows.filter(j => matchesLocationFilter(j.country ?? "BR", country));
  }
  res.json(rows.map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    country: j.country ?? "BR",
    work_type: j.work_type,
    salary: j.salary ?? undefined,
    salary_text: j.salary_text ?? undefined,
    match_score: j.match_score,
    skills_match: j.skills_match,
    skills_missing: j.skills_missing,
    description: j.description ?? undefined,
    url: j.url ?? undefined,
    hr_email: j.hr_email ?? undefined,
    contact_priority: j.contact_priority ?? "medium",
    source: j.source ?? "catalog",
    status: j.status,
    cover_letter: j.cover_letter ?? undefined,
    found_at: j.found_at?.toISOString() ?? new Date().toISOString(),
  })));
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!rows.length) { res.status(404).json({ error: "Job not found" }); return; }
  const j = rows[0];
  res.json({
    id: j.id, title: j.title, company: j.company, location: j.location,
    country: j.country ?? "BR", work_type: j.work_type,
    salary: j.salary ?? undefined, salary_text: j.salary_text ?? undefined,
    match_score: j.match_score, skills_match: j.skills_match, skills_missing: j.skills_missing,
    description: j.description ?? undefined, url: j.url ?? undefined,
    hr_email: j.hr_email ?? undefined,
    contact_priority: j.contact_priority ?? "medium",
    source: j.source ?? "catalog",
    status: j.status, cover_letter: j.cover_letter ?? undefined,
    found_at: j.found_at?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/jobs/:id/ignore", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(jobsTable).set({ status: "ignored" }).where(eq(jobsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({ id: updated.id, status: updated.status });
});

// POST /api/jobs/search — multi-source discovery + intelligent matching
router.post("/jobs/search", async (req, res) => {
  const userId = getUserId(req);

  const profile = await getCandidateProfile(userId);
  if (!profile) {
    res.status(404).json({ error: "Nenhum currículo encontrado. Faça upload primeiro." });
    return;
  }

  const resume = await getResumeForUser(userId);
  const preferredLocation = req.body?.location;

  logger.info({ userId, skills: profile.skills.slice(0, 5), title: profile.title }, "Starting multi-source job discovery");

  // Delete only pending jobs (keep applied/ignored)
  const existing = await db.select().from(jobsTable);
  const pendingIds = existing.filter(j => j.status === "pending" && j.user_id === userId).map(j => j.id);
  for (const id of pendingIds) {
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
  }

  // Run all providers
  const providerQuery = {
    skills: profile.skills,
    title: profile.title,
    location: preferredLocation,
    yearsExperience: profile.yearsExperience,
    workType: "remote",
  };

  const discovered = await providerManager.discoverJobs(providerQuery, preferredLocation);
  logger.info({ count: discovered.length }, "Discovery complete, computing match scores");

  const toInsert = discovered
    .map(job => {
      const { score, matched, missing, contactPriority } = computeMatchScore(
        job.requiredSkills,
        job.description,
        profile,
        job.hrEmail,
        job.url,
      );
      return {
        user_id: userId,
        title: job.title,
        company: job.company,
        location: job.location,
        country: job.country,
        work_type: job.workType,
        salary: job.salary ?? null,
        salary_text: job.salaryText ?? null,
        hr_email: job.hrEmail ?? null,
        match_score: score,
        skills_match: matched,
        skills_missing: missing,
        description: job.description,
        url: job.url ?? null,
        status: "pending" as const,
        source: job.source,
        contact_priority: contactPriority,
        cover_letter: generateCoverLetter(profile.name, job.title, job.company, matched.length > 0 ? matched : profile.skills, job.country),
      };
    })
    .filter(j => j.match_score >= 20)
    .sort((a, b) => b.match_score - a.match_score);

  if (!toInsert.length) {
    res.json({ jobs_found: 0, top_match: 0, message: "Nenhuma vaga compatível encontrada", sources: [] });
    return;
  }

  const inserted = await db.insert(jobsTable).values(toInsert).returning();

  // Log top matches as activity
  for (const job of inserted.filter(j => j.match_score >= 80).slice(0, 5)) {
    await db.insert(activityTable).values({
      user_id: userId,
      type: "found",
      title: job.title,
      company: job.company,
      match_score: job.match_score,
    });
  }

  const sources = [...new Set(inserted.map(j => j.source))];
  const withEmail = inserted.filter(j => j.hr_email).length;
  const topMatch = inserted[0]?.match_score ?? 0;

  res.json({
    jobs_found: inserted.length,
    top_match: topMatch,
    with_email: withEmail,
    sources,
    message: `${inserted.length} vagas encontradas de ${sources.length} fonte(s) · ${withEmail} com email direto`,
  });
});

export default router;
