import { db } from "@workspace/db";
import { candidateProfilesTable, resumeTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { extractCandidateProfile } from "../lib/resume-intelligence";
import { logger } from "../lib/logger";

export interface CandidateProfileData {
  id: number;
  userId: number;
  resumeId?: number;
  name: string;
  email?: string;
  phone?: string;
  title: string;
  location?: string;
  yearsExperience: number;
  skills: string[];
  summary?: string;
  strongestPoints: string[];
}

export async function getCandidateProfile(userId: number): Promise<CandidateProfileData | null> {
  const rows = await db
    .select()
    .from(candidateProfilesTable)
    .where(eq(candidateProfilesTable.user_id, userId))
    .orderBy(desc(candidateProfilesTable.created_at))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    userId: r.user_id,
    resumeId: r.resume_id ?? undefined,
    name: r.name,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    title: r.title ?? "Software Engineer",
    location: r.location ?? undefined,
    yearsExperience: r.years_experience ?? 5,
    skills: r.skills ?? [],
    summary: r.summary ?? undefined,
    strongestPoints: r.strongest_points ?? [],
  };
}

export async function buildProfileFromResume(userId: number, rawText: string, resumeId: number): Promise<CandidateProfileData> {
  const extracted = extractCandidateProfile(rawText);

  await db.delete(candidateProfilesTable).where(eq(candidateProfilesTable.user_id, userId));

  const [inserted] = await db.insert(candidateProfilesTable).values({
    user_id: userId,
    resume_id: resumeId,
    name: extracted.name,
    email: extracted.email ?? null,
    phone: extracted.phone ?? null,
    title: extracted.title,
    location: extracted.location ?? null,
    years_experience: extracted.yearsExperience,
    skills: extracted.skills,
    summary: extracted.summary ?? null,
    strongest_points: extracted.strongestPoints,
    raw_extracted: extracted as any,
  }).returning();

  logger.info({ name: inserted.name, skills: inserted.skills.length }, "ProfileService: candidate profile built");

  return {
    id: inserted.id,
    userId: inserted.user_id,
    resumeId: inserted.resume_id ?? undefined,
    name: inserted.name,
    email: inserted.email ?? undefined,
    phone: inserted.phone ?? undefined,
    title: inserted.title ?? "Software Engineer",
    location: inserted.location ?? undefined,
    yearsExperience: inserted.years_experience ?? 5,
    skills: inserted.skills,
    summary: inserted.summary ?? undefined,
    strongestPoints: inserted.strongest_points,
  };
}

export async function getResumeForUser(userId: number) {
  const rows = await db
    .select()
    .from(resumeTable)
    .where(eq(resumeTable.user_id, userId))
    .orderBy(desc(resumeTable.created_at))
    .limit(1);
  return rows[0] ?? null;
}
