import { Router } from "express";
import { db } from "@workspace/db";
import { resumeTable, candidateProfilesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { extractCandidateProfile } from "../lib/resume-intelligence";
import { logger } from "../lib/logger";

const router = Router();

router.get("/resume", async (_req, res) => {
  const rows = await db.select().from(resumeTable).limit(1);
  if (rows.length === 0) { res.status(404).json({ error: "No resume found" }); return; }
  const r = rows[0];

  const profileRows = await db.select().from(candidateProfilesTable).orderBy(desc(candidateProfilesTable.created_at)).limit(1);
  const profile = profileRows[0] ?? null;

  res.json({
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    skills: r.skills,
    experience_years: r.experience_years ?? 0,
    summary: r.summary ?? undefined,
    analyzed_at: r.analyzed_at?.toISOString() ?? new Date().toISOString(),
    profile: profile ? {
      name: profile.name,
      title: profile.title,
      phone: profile.phone,
      location: profile.location,
      years_experience: profile.years_experience,
      strongest_points: profile.strongest_points,
    } : null,
  });
});

router.post("/resume", async (req, res) => {
  const { name, email, raw_text, filename } = req.body;
  if (!name || !raw_text) { res.status(400).json({ error: "name and raw_text are required" }); return; }

  logger.info({ name, filename }, "Processing resume upload with ResumeIntelligence");

  const profile = extractCandidateProfile(raw_text);
  const effectiveName = profile.name !== "Candidato" ? profile.name : name;
  const effectiveEmail = profile.email ?? email ?? null;

  await db.delete(resumeTable);
  const [inserted] = await db.insert(resumeTable).values({
    name: effectiveName,
    email: effectiveEmail,
    raw_text,
    filename: filename ?? null,
    skills: profile.skills,
    experience_years: profile.yearsExperience,
    summary: profile.summary ?? null,
  }).returning();

  await db.delete(candidateProfilesTable);
  await db.insert(candidateProfilesTable).values({
    resume_id: inserted.id,
    name: effectiveName,
    email: effectiveEmail,
    phone: profile.phone ?? null,
    title: profile.title,
    location: profile.location ?? null,
    years_experience: profile.yearsExperience,
    skills: profile.skills,
    summary: profile.summary ?? null,
    strongest_points: profile.strongestPoints,
    raw_extracted: profile as any,
  });

  logger.info({ name: effectiveName, skills: profile.skills.length, title: profile.title }, "Profile extracted and saved");

  res.status(201).json({
    id: inserted.id,
    name: inserted.name,
    email: inserted.email ?? undefined,
    skills: inserted.skills,
    experience_years: inserted.experience_years ?? profile.yearsExperience,
    summary: inserted.summary ?? undefined,
    analyzed_at: inserted.analyzed_at?.toISOString() ?? new Date().toISOString(),
    profile: {
      name: effectiveName,
      title: profile.title,
      phone: profile.phone,
      location: profile.location,
      years_experience: profile.yearsExperience,
      strongest_points: profile.strongestPoints,
    },
  });
});

export default router;
