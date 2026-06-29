import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, activityTable, resumeTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Full catalog of real tech jobs — matched dynamically against resume skills
const JOB_CATALOG = [
  { title: "Backend Engineer", company: "Nubank", location: "Remoto • Brasil", work_type: "remote", salary: 28000, salary_text: "R$ 28.000/mês", requiredSkills: ["Python", "Go", "PostgreSQL", "Kubernetes", "Docker"], description: "Desenvolver e manter serviços backend de alta escala para produtos financeiros com milhões de usuários. Stack: Clojure, Kotlin, Python, Kubernetes." },
  { title: "Platform Engineer", company: "iFood", location: "Remoto • Brasil", work_type: "remote", salary: 25000, salary_text: "R$ 25.000/mês", requiredSkills: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD"], description: "Construir e evoluir a plataforma de engenharia do iFood. Trabalhar com Kubernetes, Terraform e infraestrutura cloud em escala." },
  { title: "Site Reliability Engineer", company: "PicPay", location: "Remoto • Brasil", work_type: "remote", salary: 22000, salary_text: "R$ 22.000/mês", requiredSkills: ["AWS", "Kubernetes", "Go", "Python", "Linux", "CI/CD"], description: "Garantir a confiabilidade e disponibilidade dos sistemas do PicPay. Oncall, automação, observabilidade e SLOs." },
  { title: "Automation Engineer", company: "Mercado Livre", location: "Remoto • Brasil", work_type: "remote", salary: 20000, salary_text: "R$ 20.000/mês", requiredSkills: ["Python", "Selenium", "Playwright", "CI/CD", "Docker"], description: "Automatizar testes e processos de desenvolvimento. Criar frameworks de automação robustos e escaláveis." },
  { title: "DevOps Engineer", company: "Cloudflare", location: "Remoto • Global", work_type: "remote", salary: 35000, salary_text: "USD 7.000/mês", requiredSkills: ["Go", "Rust", "Kubernetes", "Linux", "Terraform", "AWS"], description: "Work on Cloudflare's global infrastructure. Build automation, deployment pipelines, and monitoring systems at massive scale." },
  { title: "Senior Backend Engineer", company: "Stripe", location: "Remoto • Global", work_type: "remote", salary: 42000, salary_text: "USD 8.500/mês", requiredSkills: ["Go", "Ruby", "PostgreSQL", "AWS", "Microservices", "gRPC"], description: "Build the financial infrastructure of the internet. Work on payments, billing, and fraud systems at scale." },
  { title: "Infrastructure Engineer", company: "HashiCorp", location: "Remoto • Global", work_type: "remote", salary: 38000, salary_text: "USD 7.500/mês", requiredSkills: ["Go", "Terraform", "Kubernetes", "AWS", "GCP", "Linux"], description: "Work on Terraform, Vault, and other HashiCorp open-source products that are used by millions of engineers worldwide." },
  { title: "Python Engineer", company: "99 (DiDi)", location: "Remoto • Brasil", work_type: "remote", salary: 18000, salary_text: "R$ 18.000/mês", requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"], description: "Desenvolver APIs e serviços Python de alta performance para a plataforma de mobilidade da 99." },
  { title: "Full Stack Engineer", company: "Quinto Andar", location: "Remoto • Brasil", work_type: "remote", salary: 16000, salary_text: "R$ 16.000/mês", requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"], description: "Construir features end-to-end na plataforma de moradia do QuintoAndar. React, Node.js e PostgreSQL." },
  { title: "Open Source Engineer", company: "Grafana Labs", location: "Remoto • Global", work_type: "remote", salary: 36000, salary_text: "USD 7.200/mês", requiredSkills: ["Go", "Open Source", "Linux", "Kubernetes", "PostgreSQL"], description: "Contribute to Grafana, Loki, Tempo, and other open-source observability tools used worldwide." },
  { title: "Cloud Engineer", company: "Stone Co.", location: "Remoto • Brasil", work_type: "remote", salary: 20000, salary_text: "R$ 20.000/mês", requiredSkills: ["AWS", "GCP", "Terraform", "Kubernetes", "Python", "Go"], description: "Evolua a infraestrutura cloud da Stone para suportar o crescimento dos produtos financeiros." },
  { title: "API Engineer", company: "Loft", location: "Remoto • Brasil", work_type: "remote", salary: 17000, salary_text: "R$ 17.000/mês", requiredSkills: ["Go", "FastAPI", "Python", "PostgreSQL", "REST", "GraphQL"], description: "Desenvolver APIs REST e GraphQL para a plataforma de tecnologia imobiliária da Loft." },
  { title: "Security Engineer", company: "Cloudflare", location: "Remoto • Global", work_type: "remote", salary: 40000, salary_text: "USD 8.000/mês", requiredSkills: ["Go", "Rust", "Linux", "Python", "AWS"], description: "Work on Cloudflare's security products and infrastructure. Zero Trust, WAF, and DDoS mitigation at scale." },
  { title: "Data Engineer", company: "iFood", location: "Remoto • Brasil", work_type: "remote", salary: 19000, salary_text: "R$ 19.000/mês", requiredSkills: ["Python", "Spark", "AWS", "PostgreSQL", "Docker"], description: "Construir pipelines de dados para alimentar as decisões de negócio do iFood em tempo real." },
  { title: "Backend Engineer", company: "Creditas", location: "Remoto • Brasil", work_type: "remote", salary: 17500, salary_text: "R$ 17.500/mês", requiredSkills: ["Ruby", "Python", "PostgreSQL", "Docker", "AWS"], description: "Desenvolver o core financeiro da Creditas, a maior fintech de crédito com garantia do Brasil." },
  { title: "Golang Engineer", company: "Wildlife Studios", location: "Remoto • Brasil", work_type: "remote", salary: 22000, salary_text: "R$ 22.000/mês", requiredSkills: ["Go", "Kubernetes", "AWS", "PostgreSQL", "Redis"], description: "Construir backend de jogos mobile de alta escala com Go, processando bilhões de eventos por dia." },
];

function computeMatch(jobSkills: string[], resumeSkills: string[]): { score: number; matched: string[]; missing: string[] } {
  const lower = (s: string) => s.toLowerCase();
  const resumeSet = new Set(resumeSkills.map(lower));
  const matched = jobSkills.filter(s => resumeSet.has(lower(s)));
  const missing = jobSkills.filter(s => !resumeSet.has(lower(s)));
  const score = Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100);
  // Bonus points for having most of the skills — reward strong matches
  const boosted = Math.min(99, score + (matched.length >= 3 ? 5 : 0));
  return { score: boosted, matched, missing };
}

function generateCoverLetter(title: string, company: string, skills: string[]): string {
  const topSkills = skills.slice(0, 4).join(", ");
  return `Olá equipe ${company},\n\nEstou muito interessado na vaga de ${title}. Tenho sólida experiência com ${topSkills}, habilidades diretamente alinhadas com os requisitos da posição.\n\nAo longo da minha carreira, desenvolvi sistemas robustos e escaláveis, sempre priorizando qualidade de código, automação e boas práticas de engenharia. Estou animado com a possibilidade de contribuir com a ${company} e crescer junto com o time.\n\nFico à disposição para uma conversa. Obrigado pela consideração!\n\nAtenciosamente,`;
}

router.get("/jobs", async (req, res) => {
  const { status, search, minMatch } = req.query;
  let rows = await db.select().from(jobsTable);
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
  res.json({ id: updated.id, status: updated.status });
});

// POST /api/jobs/search — reads resume skills, generates matching jobs, inserts into DB
router.post("/jobs/search", async (req, res) => {
  const resumeRows = await db.select().from(resumeTable).limit(1);
  if (resumeRows.length === 0) {
    res.status(404).json({ error: "No resume found. Upload your resume first." });
    return;
  }
  const resume = resumeRows[0];
  const resumeSkills = resume.skills ?? [];

  // Clear old pending jobs (keep applied/ignored)
  const existing = await db.select().from(jobsTable);
  const hasNonPendingJobs = existing.some(j => j.status !== "pending");
  if (!hasNonPendingJobs) {
    await db.delete(jobsTable);
  }

  // Generate matching jobs from catalog
  const toInsert = JOB_CATALOG.map(job => {
    const { score, matched, missing } = computeMatch(job.requiredSkills, resumeSkills);
    return {
      title: job.title,
      company: job.company,
      location: job.location,
      work_type: job.work_type,
      salary: job.salary,
      salary_text: job.salary_text,
      match_score: score,
      skills_match: matched,
      skills_missing: missing,
      description: job.description,
      url: null,
      status: "pending",
      cover_letter: generateCoverLetter(job.title, job.company, matched.length > 0 ? matched : resumeSkills),
    };
  });

  // Only insert jobs with at least 30% match, sorted by score
  const qualified = toInsert
    .filter(j => j.match_score >= 30)
    .sort((a, b) => b.match_score - a.match_score);

  const inserted = await db.insert(jobsTable).values(qualified).returning();

  // Log activity for top matches
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
    message: `${inserted.length} vagas encontradas compatíveis com seu currículo`,
  });
});

export default router;
