import { Router } from "express";
import { db } from "@workspace/db";
import { resumeTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/resume", async (req, res) => {
  const rows = await db.select().from(resumeTable).limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "No resume found" });
    return;
  }
  const r = rows[0];
  res.json({
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    skills: r.skills,
    experience_years: r.experience_years ?? 0,
    summary: r.summary ?? undefined,
    analyzed_at: r.analyzed_at?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/resume", async (req, res) => {
  const { name, email, raw_text, filename } = req.body;
  if (!name || !raw_text) {
    res.status(400).json({ error: "name and raw_text are required" });
    return;
  }

  // Simple skill extraction from raw text
  const skillKeywords = [
    "Python", "Go", "Golang", "TypeScript", "JavaScript", "Java", "Rust", "Ruby",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
    "FastAPI", "Django", "Node.js", "React", "Next.js",
    "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "CI/CD", "GitHub Actions", "Jenkins",
    "Linux", "Bash", "Shell",
    "Automação", "Selenium", "Playwright",
    "Microservices", "REST", "GraphQL", "gRPC",
    "Open Source", "Git",
  ];
  const lower = raw_text.toLowerCase();
  const skills = skillKeywords.filter(s => lower.includes(s.toLowerCase()));
  if (skills.length === 0) skills.push("Python", "Go", "AWS", "FastAPI", "CI/CD");

  // Delete old resume and insert new
  await db.delete(resumeTable);
  const [inserted] = await db.insert(resumeTable).values({
    name,
    email: email ?? null,
    raw_text,
    filename: filename ?? null,
    skills,
    experience_years: 5,
    summary: `Profissional com experiência em ${skills.slice(0, 3).join(", ")} e outras tecnologias.`,
  }).returning();

  res.status(201).json({
    id: inserted.id,
    name: inserted.name,
    email: inserted.email ?? undefined,
    skills: inserted.skills,
    experience_years: inserted.experience_years ?? 5,
    summary: inserted.summary ?? undefined,
    analyzed_at: inserted.analyzed_at?.toISOString() ?? new Date().toISOString(),
  });
});

export default router;
