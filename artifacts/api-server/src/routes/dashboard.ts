import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, applicationsTable, agentTable, activityTable, resumeTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserId } from "../services/user.service";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const userId = getUserId(req);

  const [jobs, applications, agentRows, resumeRows] = await Promise.all([
    db.select().from(jobsTable).where(eq(jobsTable.user_id, userId)),
    db.select().from(applicationsTable).where(eq(applicationsTable.user_id, userId)),
    db.select().from(agentTable).where(eq(agentTable.user_id, userId)).limit(1),
    db.select().from(resumeTable).where(eq(resumeTable.user_id, userId)).limit(1),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jobsToday = jobs.filter(j => j.found_at && j.found_at >= today).length;
  const interviews = applications.filter(a => a.status === "interview").length;
  const offers = applications.filter(a => a.status === "offer").length;
  const agentRunning = agentRows[0]?.running ?? false;
  const onboardingComplete = resumeRows.length > 0;
  const withEmail = jobs.filter(j => j.hr_email).length;

  res.json({
    jobs_found_today: jobsToday || jobs.length,
    applications_total: applications.length,
    interviews,
    offers,
    agent_running: agentRunning,
    onboarding_complete: onboardingComplete,
    jobs_with_email: withEmail,
  });
});

router.get("/dashboard/activity", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db.select().from(activityTable).where(eq(activityTable.user_id, userId));
  const sorted = rows
    .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))
    .slice(0, 20);
  res.json(sorted.map(a => ({
    id: a.id, type: a.type, title: a.title, company: a.company,
    timestamp: a.timestamp?.toISOString() ?? new Date().toISOString(),
    match_score: a.match_score ?? undefined,
  })));
});

export default router;
