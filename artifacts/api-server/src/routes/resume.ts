import { Router } from "express";
import { db } from "@workspace/db";
import { resumeTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildProfileFromResume, getCandidateProfile, getResumeForUser } from "../services/profile.service";
import { getUserId } from "../services/user.service";
import { logger } from "../lib/logger";

const router = Router();

router.get("/resume", async (req, res) => {
  const userId = getUserId(req);
  const resume = await getResumeForUser(userId);
  if (!resume) { res.status(404).json({ error: "No resume found" }); return; }

  const profile = await getCandidateProfile(userId);

  res.json({
    id: resume.id,
    name: resume.name,
    email: resume.email ?? undefined,
    skills: resume.skills,
    experience_years: resume.experience_years ?? 0,
    summary: resume.summary ?? undefined,
    analyzed_at: resume.analyzed_at?.toISOString() ?? new Date().toISOString(),
    profile: profile ? {
      name: profile.name,
      title: profile.title,
      phone: profile.phone,
      location: profile.location,
      years_experience: profile.yearsExperience,
      strongest_points: profile.strongestPoints,
    } : null,
  });
});

router.post("/resume", async (req, res) => {
  const { name, email, raw_text, filename } = req.body;
  if (!name || !raw_text) { res.status(400).json({ error: "name and raw_text are required" }); return; }

  const userId = getUserId(req);
  logger.info({ userId, name, filename }, "ResumeService: processing upload");

  await db.delete(resumeTable).where(eq(resumeTable.user_id, userId));

  const [inserted] = await db.insert(resumeTable).values({
    user_id: userId,
    name,
    email: email ?? null,
    raw_text,
    filename: filename ?? null,
    skills: [],
    experience_years: 0,
  }).returning();

  const profile = await buildProfileFromResume(userId, raw_text, inserted.id);

  // Update resume with extracted data
  await db.update(resumeTable)
    .set({
      name: profile.name,
      email: profile.email ?? email ?? null,
      skills: profile.skills,
      experience_years: profile.yearsExperience,
      summary: profile.summary ?? null,
    })
    .where(eq(resumeTable.id, inserted.id));

  res.status(201).json({
    id: inserted.id,
    name: profile.name,
    email: profile.email ?? email ?? undefined,
    skills: profile.skills,
    experience_years: profile.yearsExperience,
    summary: profile.summary ?? undefined,
    analyzed_at: inserted.analyzed_at?.toISOString() ?? new Date().toISOString(),
    profile: {
      name: profile.name,
      title: profile.title,
      phone: profile.phone,
      location: profile.location,
      years_experience: profile.yearsExperience,
      strongest_points: profile.strongestPoints,
    },
  });
});

export default router;
