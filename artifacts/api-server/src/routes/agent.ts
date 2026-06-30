import { Router } from "express";
import { db } from "@workspace/db";
import { agentTable, jobsTable, outboundEmailsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendApplicationForJob } from "../services/application.service";
import { getCandidateProfile } from "../services/profile.service";
import { getUserId } from "../services/user.service";
import { logger } from "../lib/logger";

const router = Router();

const MAX_EMAILS_PER_RUN = 10;
const MIN_MATCH_SCORE = 85;

async function getOrCreateAgent(userId: number) {
  const rows = await db.select().from(agentTable).where(eq(agentTable.user_id, userId)).limit(1);
  if (rows.length > 0) return rows[0];
  const [inserted] = await db.insert(agentTable).values({
    user_id: userId,
    running: false,
    jobs_scanned_today: 0,
    applications_today: 0,
  }).returning();
  return inserted;
}

router.get("/agent/status", async (req, res) => {
  const userId = getUserId(req);
  const agent = await getOrCreateAgent(userId);
  res.json({
    running: agent.running,
    jobs_scanned_today: agent.jobs_scanned_today,
    applications_today: agent.applications_today,
    last_run_at: agent.last_run_at?.toISOString() ?? null,
  });
});

// POST /api/agent/start — runs ApplicationService for all eligible pending jobs
router.post("/agent/start", async (req, res) => {
  const userId = getUserId(req);
  const agent = await getOrCreateAgent(userId);

  const profile = await getCandidateProfile(userId);
  if (!profile) {
    res.status(400).json({ error: "Nenhum currículo encontrado. Faça upload primeiro." });
    return;
  }

  // Gate: require at least 1 successful test email before bulk send
  const successfulTests = await db
    .select()
    .from(outboundEmailsTable)
    .where(and(eq(outboundEmailsTable.user_id, userId), eq(outboundEmailsTable.status, "sent")));
  if (successfulTests.length === 0) {
    res.status(403).json({
      error: "Envio em lote bloqueado",
      detail: "Acesse 'Teste de Email' e envie ao menos 1 email de teste real com sucesso antes de liberar o envio em lote.",
      test_gate: { passed: false, required: 1, successful_tests: 0 },
    });
    return;
  }

  const pendingJobs = await db.select().from(jobsTable).where(
    and(eq(jobsTable.status, "pending"), eq(jobsTable.user_id, userId))
  );

  const qualified = pendingJobs
    .filter(j => j.match_score >= MIN_MATCH_SCORE && j.hr_email)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MAX_EMAILS_PER_RUN);

  logger.info({ userId, qualified: qualified.length, pending: pendingJobs.length }, "Agent starting");

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results: { job: string; company: string; to: string; status: string }[] = [];

  for (const job of qualified) {
    const result = await sendApplicationForJob(job.id, userId);
    if (result.success) {
      sent++;
      results.push({ job: job.title, company: job.company, to: result.to ?? "—", status: "✓ enviado" });
    } else if (result.error?.includes("já enviada") || result.error?.includes("duplicata")) {
      skipped++;
      results.push({ job: job.title, company: job.company, to: job.hr_email ?? "—", status: "já enviada" });
    } else {
      failed++;
      results.push({ job: job.title, company: job.company, to: job.hr_email ?? "—", status: `✗ ${result.error}` });
    }
  }

  const [updatedAgent] = await db.update(agentTable)
    .set({
      running: true,
      last_run_at: new Date(),
      jobs_scanned_today: (agent.jobs_scanned_today ?? 0) + pendingJobs.length,
      applications_today: (agent.applications_today ?? 0) + sent,
    })
    .where(eq(agentTable.id, agent.id))
    .returning();

  res.json({
    running: true,
    jobs_scanned: pendingJobs.length,
    jobs_qualified: qualified.length,
    emails_sent: sent,
    emails_failed: failed,
    emails_skipped: skipped,
    jobs_scanned_today: updatedAgent.jobs_scanned_today,
    applications_today: updatedAgent.applications_today,
    last_run_at: updatedAgent.last_run_at?.toISOString(),
    results,
    note: sent === 0
      ? qualified.length === 0
        ? `Nenhuma vaga com match ≥${MIN_MATCH_SCORE}% e email de contato disponível.`
        : `${failed} erro(s) ao enviar.`
      : `${sent} candidatura(s) enviada(s) com sucesso.`,
  });
});

router.post("/agent/stop", async (req, res) => {
  const userId = getUserId(req);
  const agent = await getOrCreateAgent(userId);
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
