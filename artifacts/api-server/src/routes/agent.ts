import { Router } from "express";
import { db } from "@workspace/db";
import { agentTable, jobsTable, applicationsTable, activityTable, resumeTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateAgent() {
  const rows = await db.select().from(agentTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [inserted] = await db.insert(agentTable).values({
    running: false,
    jobs_scanned_today: 0,
    applications_today: 0,
  }).returning();
  return inserted;
}

router.get("/agent/status", async (req, res) => {
  const agent = await getOrCreateAgent();
  res.json({
    running: agent.running,
    jobs_scanned_today: agent.jobs_scanned_today,
    applications_today: agent.applications_today,
    last_run_at: agent.last_run_at?.toISOString() ?? null,
  });
});

// POST /api/agent/start — reads resume, auto-applies to all compatible pending jobs
router.post("/agent/start", async (req, res) => {
  const agent = await getOrCreateAgent();

  // Get resume for personalization
  const resumeRows = await db.select().from(resumeTable).limit(1);
  const resumeName = resumeRows[0]?.name ?? "Candidato";

  // Find all pending jobs with good match score
  const pendingJobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.status, "pending"));

  const qualifiedJobs = pendingJobs
    .filter(j => j.match_score >= 60)
    .sort((a, b) => b.match_score - a.match_score);

  let applicationsCreated = 0;

  for (const job of qualifiedJobs) {
    // Check if already applied
    const existingApp = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.job_id, job.id));

    if (existingApp.length > 0) continue;

    // Generate cover letter if missing
    const coverLetter = job.cover_letter ??
      `Olá equipe ${job.company},\n\nEstou muito animado com a oportunidade de ${job.title}. Meu perfil é fortemente alinhado com os requisitos da vaga — especialmente em ${(job.skills_match ?? []).slice(0, 3).join(", ")}.\n\nFico à disposição!\n\n${resumeName}`;

    // Update job as applied
    await db.update(jobsTable)
      .set({ status: "applied", cover_letter: coverLetter })
      .where(eq(jobsTable.id, job.id));

    // Create application record
    await db.insert(applicationsTable).values({
      job_id: job.id,
      job_title: job.title,
      company: job.company,
      status: "applied",
      notes: `Candidatura automática enviada pelo agente IA. Match: ${job.match_score}%`,
      salary: job.salary ?? null,
      work_type: job.work_type,
      match_score: job.match_score,
    });

    // Log activity
    await db.insert(activityTable).values({
      type: "applied",
      title: job.title,
      company: job.company,
      match_score: job.match_score,
    });

    applicationsCreated++;
  }

  // Update agent stats
  const [updatedAgent] = await db.update(agentTable)
    .set({
      running: true,
      last_run_at: new Date(),
      jobs_scanned_today: (agent.jobs_scanned_today ?? 0) + pendingJobs.length,
      applications_today: (agent.applications_today ?? 0) + applicationsCreated,
    })
    .where(eq(agentTable.id, agent.id))
    .returning();

  res.json({
    running: true,
    jobs_scanned_today: updatedAgent.jobs_scanned_today,
    applications_today: updatedAgent.applications_today,
    last_run_at: updatedAgent.last_run_at?.toISOString() ?? new Date().toISOString(),
    applications_sent: applicationsCreated,
    message: `Agente iniciado. ${applicationsCreated} candidaturas enviadas automaticamente.`,
  });
});

router.post("/agent/stop", async (req, res) => {
  const agent = await getOrCreateAgent();
  const [updated] = await db.update(agentTable)
    .set({ running: false })
    .where(eq(agentTable.id, agent.id))
    .returning();
  res.json({
    running: false,
    jobs_scanned_today: updated.jobs_scanned_today,
    applications_today: updated.applications_today,
    last_run_at: updated.last_run_at?.toISOString() ?? null,
  });
});

export default router;
