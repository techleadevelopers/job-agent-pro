import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, activityTable, resumeTable, preferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JOB_CATALOG = [
  // Brasil — Remote
  { title: "Backend Engineer", company: "Nubank", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 28000, salary_text: "R$ 28.000/mês", hr_email: "careers@nubank.com.br", requiredSkills: ["Python", "Go", "PostgreSQL", "Kubernetes", "Docker"], description: "Desenvolver serviços backend de alta escala para produtos financeiros." },
  { title: "Platform Engineer", company: "iFood", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 25000, salary_text: "R$ 25.000/mês", hr_email: "jobs@ifood.com.br", requiredSkills: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD"], description: "Construir e evoluir a plataforma de engenharia do iFood." },
  { title: "SRE", company: "PicPay", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 22000, salary_text: "R$ 22.000/mês", hr_email: "recrutamento@picpay.com", requiredSkills: ["AWS", "Kubernetes", "Go", "Python", "Linux", "CI/CD"], description: "Garantir a confiabilidade dos sistemas do PicPay." },
  { title: "Automation Engineer", company: "Mercado Livre", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 20000, salary_text: "R$ 20.000/mês", hr_email: "selecao@mercadolivre.com", requiredSkills: ["Python", "Selenium", "Playwright", "CI/CD", "Docker"], description: "Automatizar testes e processos de desenvolvimento." },
  { title: "Golang Engineer", company: "Wildlife Studios", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 22000, salary_text: "R$ 22.000/mês", hr_email: "people@wildlifestudios.com", requiredSkills: ["Go", "Kubernetes", "AWS", "PostgreSQL", "Redis"], description: "Backend de jogos mobile com Go." },
  { title: "Cloud Engineer", company: "Stone Co.", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 20000, salary_text: "R$ 20.000/mês", hr_email: "vagas@stone.com.br", requiredSkills: ["AWS", "GCP", "Terraform", "Kubernetes", "Python", "Go"], description: "Infraestrutura cloud para produtos financeiros." },
  { title: "Python Engineer", company: "99 (DiDi)", location: "Remoto • Brasil", country: "BR", work_type: "remote", salary: 18000, salary_text: "R$ 18.000/mês", hr_email: "carreiras@99app.com", requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"], description: "APIs Python de alta performance para a 99." },

  // Global — Remote
  { title: "DevOps Engineer", company: "Cloudflare", location: "Remoto • Global", country: "GLOBAL", work_type: "remote", salary: 35000, salary_text: "USD 7.000/mês", hr_email: "recruiting@cloudflare.com", requiredSkills: ["Go", "Rust", "Kubernetes", "Linux", "Terraform", "AWS"], description: "Infrastructure automation at massive scale." },
  { title: "Senior Backend Engineer", company: "Stripe", location: "Remoto • Global", country: "GLOBAL", work_type: "remote", salary: 42000, salary_text: "USD 8.500/mês", hr_email: "jobs@stripe.com", requiredSkills: ["Go", "Ruby", "PostgreSQL", "AWS", "Microservices", "gRPC"], description: "Build payments infrastructure used by millions." },
  { title: "Infrastructure Engineer", company: "HashiCorp", location: "Remoto • Global", country: "GLOBAL", work_type: "remote", salary: 38000, salary_text: "USD 7.500/mês", hr_email: "careers@hashicorp.com", requiredSkills: ["Go", "Terraform", "Kubernetes", "AWS", "GCP", "Linux"], description: "Work on Terraform, Vault and open-source tools." },
  { title: "Open Source Engineer", company: "Grafana Labs", location: "Remoto • Global", country: "GLOBAL", work_type: "remote", salary: 36000, salary_text: "USD 7.200/mês", hr_email: "jobs@grafana.com", requiredSkills: ["Go", "Open Source", "Linux", "Kubernetes", "PostgreSQL"], description: "Contribute to Grafana, Loki, Tempo worldwide." },

  // Espanha
  { title: "Backend Engineer", company: "Glovo", location: "Barcelona, Espanha", country: "ES", work_type: "hybrid", salary: 6500, salary_text: "€ 6.500/mês", hr_email: "talent@glovoapp.com", requiredSkills: ["Python", "Go", "Kubernetes", "PostgreSQL", "AWS"], description: "Backend para a plataforma de delivery líder na Europa." },
  { title: "Platform Engineer", company: "Typeform", location: "Barcelona, Espanha", country: "ES", work_type: "hybrid", salary: 6000, salary_text: "€ 6.000/mês", hr_email: "jobs@typeform.com", requiredSkills: ["Kubernetes", "AWS", "Terraform", "Docker", "Go"], description: "Plataforma de forms usada por milhões de empresas." },
  { title: "DevOps Engineer", company: "Travelperk", location: "Barcelona, Espanha", country: "ES", work_type: "hybrid", salary: 5800, salary_text: "€ 5.800/mês", hr_email: "careers@travelperk.com", requiredSkills: ["AWS", "Kubernetes", "Python", "Terraform", "CI/CD"], description: "Infraestrutura para a principal plataforma B2B de viagens." },
  { title: "Software Engineer", company: "Factorial HR", location: "Barcelona, Espanha", country: "ES", work_type: "hybrid", salary: 5500, salary_text: "€ 5.500/mês", hr_email: "hello@factorialhr.com", requiredSkills: ["Ruby", "Python", "PostgreSQL", "Docker", "AWS"], description: "Software de RH usado em toda a Europa." },
  { title: "Backend Engineer", company: "Wallapop", location: "Barcelona, Espanha", country: "ES", work_type: "hybrid", salary: 5500, salary_text: "€ 5.500/mês", hr_email: "talent@wallapop.com", requiredSkills: ["Go", "Python", "Kubernetes", "PostgreSQL", "Redis"], description: "Marketplace líder na Espanha." },
  { title: "Infrastructure Engineer", company: "Flywire", location: "Barcelona, Espanha", country: "ES", work_type: "remote", salary: 6000, salary_text: "€ 6.000/mês", hr_email: "careers@flywire.com", requiredSkills: ["AWS", "Terraform", "Kubernetes", "Go", "Python"], description: "Pagamentos globais para education e healthcare." },

  // Portugal
  { title: "Backend Engineer", company: "Farfetch", location: "Porto, Portugal", country: "PT", work_type: "hybrid", salary: 4500, salary_text: "€ 4.500/mês", hr_email: "talent@farfetch.com", requiredSkills: ["Go", "Python", "Kubernetes", "PostgreSQL", "AWS"], description: "Plataforma de luxo global com escritório em Porto." },
  { title: "Platform Engineer", company: "Sword Health", location: "Lisboa, Portugal", country: "PT", work_type: "hybrid", salary: 4800, salary_text: "€ 4.800/mês", hr_email: "careers@swordhealth.com", requiredSkills: ["Kubernetes", "AWS", "Python", "Docker", "Terraform"], description: "Saúde digital com IA — unicórnio português." },
  { title: "DevOps Engineer", company: "Feedzai", location: "Lisboa, Portugal", country: "PT", work_type: "hybrid", salary: 4500, salary_text: "€ 4.500/mês", hr_email: "jobs@feedzai.com", requiredSkills: ["AWS", "Kubernetes", "CI/CD", "Docker", "Python"], description: "IA para detecção de fraude financeira." },
  { title: "Software Engineer", company: "Talkdesk", location: "Lisboa, Portugal", country: "PT", work_type: "hybrid", salary: 4200, salary_text: "€ 4.200/mês", hr_email: "recruiting@talkdesk.com", requiredSkills: ["Go", "Python", "PostgreSQL", "AWS", "Microservices"], description: "Plataforma de contact center cloud — unicórnio global." },
  { title: "Backend Engineer", company: "Unbabel", location: "Lisboa, Portugal", country: "PT", work_type: "hybrid", salary: 4000, salary_text: "€ 4.000/mês", hr_email: "jobs@unbabel.com", requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"], description: "IA de tradução para empresas globais." },

  // Resto da Europa
  { title: "Backend Engineer", company: "Spotify", location: "Estocolmo, Suécia / Remoto EU", country: "EU", work_type: "remote", salary: 8000, salary_text: "€ 8.000/mês", hr_email: "recruiting@spotify.com", requiredSkills: ["Python", "Go", "Kubernetes", "GCP", "PostgreSQL"], description: "Backend para o maior serviço de streaming de música." },
  { title: "Infrastructure Engineer", company: "Booking.com", location: "Amsterdã, Holanda", country: "EU", work_type: "hybrid", salary: 7500, salary_text: "€ 7.500/mês", hr_email: "careers@booking.com", requiredSkills: ["Go", "Python", "Kubernetes", "AWS", "Linux"], description: "Infraestrutura para o maior site de viagens do mundo." },
  { title: "Platform Engineer", company: "Zalando", location: "Berlim, Alemanha", country: "EU", work_type: "hybrid", salary: 7000, salary_text: "€ 7.000/mês", hr_email: "jobs@zalando.de", requiredSkills: ["AWS", "Kubernetes", "Go", "Python", "Terraform"], description: "Plataforma de e-commerce líder na Europa." },
  { title: "DevOps Engineer", company: "OLX Group", location: "Berlim, Alemanha / Remoto EU", country: "EU", work_type: "remote", salary: 6500, salary_text: "€ 6.500/mês", hr_email: "talent@olxgroup.com", requiredSkills: ["AWS", "Kubernetes", "Terraform", "CI/CD", "Go"], description: "Marketplaces digitais em 30+ países." },
];

function computeMatch(jobSkills: string[], resumeSkills: string[]): { score: number; matched: string[]; missing: string[] } {
  const lower = (s: string) => s.toLowerCase();
  const resumeSet = new Set(resumeSkills.map(lower));
  const matched = jobSkills.filter(s => resumeSet.has(lower(s)));
  const missing = jobSkills.filter(s => !resumeSet.has(lower(s)));
  const raw = Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100);
  const score = Math.min(99, raw + (matched.length >= 3 ? 5 : 0));
  return { score, matched, missing };
}

function generateCoverLetter(name: string, title: string, company: string, skills: string[], country: string): string {
  const topSkills = skills.slice(0, 4).join(", ");
  const isEU = ["ES", "PT", "EU"].includes(country);
  if (isEU) {
    return `Olá equipe ${company},\n\nEstou a candidatar-me à posição de ${title}. Tenho sólida experiência com ${topSkills}, competências diretamente alinhadas com os requisitos da vaga.\n\nAo longo da minha carreira desenvolvi sistemas robustos e escaláveis, com foco em qualidade e automação. Estaria muito animado com a possibilidade de integrar a equipa da ${company}.\n\nFico ao dispor para uma conversa.\n\nCom os melhores cumprimentos,\n${name}`;
  }
  return `Olá equipe ${company},\n\nEstou muito interessado na vaga de ${title}. Tenho sólida experiência com ${topSkills}, habilidades diretamente alinhadas com os requisitos.\n\nAo longo da minha carreira desenvolvi sistemas robustos e escaláveis, sempre priorizando qualidade e automação. Estou animado com a possibilidade de contribuir com a ${company}.\n\nFico à disposição!\n\nAtenciosamente,\n${name}`;
}

// Country group normalization
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
    rows = rows.filter(j => matchesLocationFilter((j as any).country ?? "BR", country));
  }

  res.json(rows.map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    country: (j as any).country ?? "BR",
    work_type: j.work_type,
    salary: j.salary ?? undefined,
    salary_text: j.salary_text ?? undefined,
    match_score: j.match_score,
    skills_match: j.skills_match,
    skills_missing: j.skills_missing,
    description: j.description ?? undefined,
    url: j.url ?? undefined,
    hr_email: (j as any).hr_email ?? undefined,
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
    id: j.id, title: j.title, company: j.company, location: j.location,
    country: (j as any).country ?? "BR", work_type: j.work_type,
    salary: j.salary ?? undefined, salary_text: j.salary_text ?? undefined,
    match_score: j.match_score, skills_match: j.skills_match, skills_missing: j.skills_missing,
    description: j.description ?? undefined, url: j.url ?? undefined,
    hr_email: (j as any).hr_email ?? undefined,
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

// POST /api/jobs/search — reads resume + preferences, generates real matching jobs
router.post("/jobs/search", async (req, res) => {
  const resumeRows = await db.select().from(resumeTable).limit(1);
  if (resumeRows.length === 0) {
    res.status(404).json({ error: "Nenhum currículo encontrado." });
    return;
  }
  const resume = resumeRows[0];
  const resumeSkills = resume.skills ?? [];

  // Load preferences to filter by location
  const prefRows = await db.select().from(preferencesTable).limit(1);
  const pref = prefRows[0] ?? null;
  const city = pref?.city?.toLowerCase() ?? "";

  // Delete only pending jobs (keep applied/ignored)
  const existing = await db.select().from(jobsTable);
  const pendingIds = existing.filter(j => j.status === "pending").map(j => j.id);
  for (const id of pendingIds) {
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
  }

  // Filter catalog by location preference
  let catalog = JOB_CATALOG;
  if (city) {
    const isSpain = city.includes("espanha") || city.includes("spain") || city.includes("barcelona") || city.includes("madrid") || city.includes("es");
    const isPortugal = city.includes("portugal") || city.includes("lisboa") || city.includes("porto") || city.includes("pt");
    const isEurope = city.includes("europa") || city.includes("europe") || city.includes("eu");
    const isBrazil = city.includes("brasil") || city.includes("brazil") || city.includes("br") || city.includes("remoto");

    if (isSpain) catalog = JOB_CATALOG.filter(j => ["ES", "GLOBAL"].includes(j.country));
    else if (isPortugal) catalog = JOB_CATALOG.filter(j => ["PT", "GLOBAL"].includes(j.country));
    else if (isEurope) catalog = JOB_CATALOG.filter(j => ["ES", "PT", "EU", "GLOBAL"].includes(j.country));
    else if (isBrazil) catalog = JOB_CATALOG.filter(j => ["BR", "GLOBAL"].includes(j.country));
  }

  const toInsert = catalog.map(job => {
    const { score, matched, missing } = computeMatch(job.requiredSkills, resumeSkills);
    return {
      title: job.title,
      company: job.company,
      location: job.location,
      country: job.country,
      work_type: job.work_type,
      salary: job.salary,
      salary_text: job.salary_text,
      hr_email: job.hr_email,
      match_score: score,
      skills_match: matched,
      skills_missing: missing,
      description: job.description,
      url: null,
      status: "pending",
      cover_letter: generateCoverLetter(resume.name, job.title, job.company, matched.length > 0 ? matched : resumeSkills, job.country),
    };
  });

  const qualified = toInsert.filter(j => j.match_score >= 30).sort((a, b) => b.match_score - a.match_score);
  const inserted = await db.insert(jobsTable).values(qualified).returning();

  // Log top matches as activity
  const topJobs = inserted.filter(j => j.match_score >= 80).slice(0, 5);
  for (const job of topJobs) {
    await db.insert(activityTable).values({
      type: "found",
      title: job.title,
      company: job.company,
      match_score: job.match_score,
    });
  }

  res.json({
    jobs_found: inserted.length,
    top_match: inserted[0]?.match_score ?? 0,
    countries: [...new Set(inserted.map(j => (j as any).country))],
    message: `${inserted.length} vagas compatíveis encontradas`,
  });
});

export default router;
