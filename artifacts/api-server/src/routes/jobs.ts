import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, activityTable } from "@workspace/db";
import { eq, gte, ilike, or } from "drizzle-orm";

const router = Router();

router.get("/jobs", async (req, res) => {
  const { status, search, minMatch } = req.query;
  let rows = await db.select().from(jobsTable).orderBy(jobsTable.match_score);

  // Sort descending by match_score
  rows = rows.sort((a, b) => b.match_score - a.match_score);

  if (status && status !== "all") {
    rows = rows.filter(j => j.status === status);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    rows = rows.filter(j =>
      j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    );
  }
  if (minMatch) {
    const min = parseInt(minMatch as string, 10);
    rows = rows.filter(j => j.match_score >= min);
  }

  res.json(rows.map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    work_type: j.work_type,
    salary: j.salary ?? undefined,
    salary_text: j.salary_text ?? undefined,
    match_score: j.match_score,
    skills_match: j.skills_match,
    skills_missing: j.skills_missing,
    description: j.description ?? undefined,
    url: j.url ?? undefined,
    status: j.status,
    cover_letter: j.cover_letter ?? undefined,
    found_at: j.found_at?.toISOString() ?? new Date().toISOString(),
  })));
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (rows.length === 0) { res.status(404).json({ error: "Job not found" }); return; }
  const j = rows[0];
  res.json({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    work_type: j.work_type,
    salary: j.salary ?? undefined,
    salary_text: j.salary_text ?? undefined,
    match_score: j.match_score,
    skills_match: j.skills_match,
    skills_missing: j.skills_missing,
    description: j.description ?? undefined,
    url: j.url ?? undefined,
    status: j.status,
    cover_letter: j.cover_letter ?? undefined,
    found_at: j.found_at?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/jobs/:id/ignore", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(jobsTable).set({ status: "ignored" }).where(eq(jobsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({
    id: updated.id,
    title: updated.title,
    company: updated.company,
    location: updated.location,
    work_type: updated.work_type,
    salary: updated.salary ?? undefined,
    salary_text: updated.salary_text ?? undefined,
    match_score: updated.match_score,
    skills_match: updated.skills_match,
    skills_missing: updated.skills_missing,
    description: updated.description ?? undefined,
    url: updated.url ?? undefined,
    status: updated.status,
    cover_letter: updated.cover_letter ?? undefined,
    found_at: updated.found_at?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/jobs/search", async (req, res) => {
  // In a real system this would trigger Selenium/Playwright
  // For demo, return count of existing jobs
  const rows = await db.select().from(jobsTable);
  res.json({ jobs_found: rows.length, message: "Busca concluída com sucesso" });
});

export default router;
