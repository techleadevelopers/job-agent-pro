import { Router } from "express";
import { db } from "@workspace/db";
import { agentTable, jobsTable, applicationsTable, activityTable, resumeTable, outboundEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";

const router = Router();

const MAX_EMAILS_PER_RUN = 30;
const MIN_MATCH_SCORE = 70;

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

function buildHtml(name: string, title: string, company: string, body: string, skills: string[]): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}
.hdr{border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:20px}
.nm{font-size:20px;font-weight:bold;color:#4f46e5}
.sk{background:#f5f3ff;border-radius:8px;padding:10px 14px;margin:16px 0;font-size:14px}
.ft{border-top:1px solid #e5e7eb;margin-top:24px;padding-top:12px;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="hdr"><div class="nm">${name}</div>
<div style="font-size:13px;color:#6b7280;">Candidatura para ${title} — ${company}</div></div>
<div style="white-space:pre-line;line-height:1.7;">${body}</div>
<div class="sk"><strong>Principais competências:</strong> ${skills.slice(0, 6).join(", ")}</div>
<div class="ft">Enviado via AI Job Agent. Para remover, responda "remover".</div>
</body></html>`;
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

// POST /api/agent/start — finds all compatible pending jobs and sends REAL emails
router.post("/agent/start", async (req, res) => {
  const agent = await getOrCreateAgent();

  const resumeRows = await db.select().from(resumeTable).limit(1);
  if (resumeRows.length === 0) {
    res.status(400).json({ error: "Nenhum currículo encontrado. Faça upload primeiro." });
    return;
  }
  const resume = resumeRows[0];
  const skills = resume.skills ?? [];

  const pendingJobs = await db.select().from(jobsTable).where(eq(jobsTable.status, "pending"));
  const qualified = pendingJobs
    .filter(j => j.match_score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MAX_EMAILS_PER_RUN);

  let sent = 0;
  let failed = 0;
  const results: { job: string; company: string; to: string; status: string }[] = [];

  for (const job of qualified) {
    // Skip if already applied
    const existing = await db.select().from(applicationsTable).where(eq(applicationsTable.job_id, job.id));
    if (existing.length > 0) continue;

    // Use job's hr_email if set, otherwise use a generic contact derived from company domain
    const hrEmail = (job as any).hr_email ?? null;
    if (!hrEmail) {
      // No contact email — mark as pending_contact, skip email for now
      results.push({ job: job.title, company: job.company, to: "—", status: "sem email de contato" });
      continue;
    }

    const coverLetter = job.cover_letter ??
      `Olá equipe ${job.company},\n\nEstou muito animado com a oportunidade de ${job.title}. Meu perfil é fortemente alinhado com os requisitos — especialmente em ${(job.skills_match ?? []).slice(0, 3).join(", ")}.\n\nFico à disposição para uma conversa!\n\n${resume.name}`;

    const subject = `Candidatura: ${job.title} — ${resume.name}`;
    const html = buildHtml(resume.name, job.title, job.company, coverLetter, skills);

    try {
      const { messageId } = await sendEmail({
        to: hrEmail,
        subject,
        html,
        text: coverLetter,
      });

      await db.insert(outboundEmailsTable).values({
        job_id: job.id,
        to_email: hrEmail,
        subject,
        body_text: coverLetter,
        body_html: html,
        message_id: messageId,
        status: "sent",
      });

      await db.update(jobsTable).set({ status: "applied" }).where(eq(jobsTable.id, job.id));

      await db.insert(applicationsTable).values({
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        status: "applied",
        notes: `Email real enviado para ${hrEmail}. MessageID: ${messageId}`,
        salary: job.salary ?? null,
        work_type: job.work_type,
        match_score: job.match_score,
      });

      await db.insert(activityTable).values({
        type: "applied",
        title: job.title,
        company: job.company,
        match_score: job.match_score,
      });

      results.push({ job: job.title, company: job.company, to: hrEmail, status: "email enviado ✓" });
      sent++;
    } catch (err: any) {
      await db.insert(outboundEmailsTable).values({
        job_id: job.id,
        to_email: hrEmail,
        subject,
        body_text: coverLetter,
        body_html: html,
        status: "failed",
        error: err?.message ?? "erro desconhecido",
      });
      results.push({ job: job.title, company: job.company, to: hrEmail, status: `falhou: ${err?.message}` });
      failed++;
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
    emails_sent: sent,
    emails_failed: failed,
    jobs_scanned_today: updatedAgent.jobs_scanned_today,
    applications_today: updatedAgent.applications_today,
    last_run_at: updatedAgent.last_run_at?.toISOString(),
    results,
    note: sent === 0 && failed === 0
      ? "Nenhuma vaga com email de contato encontrada. Adicione vagas com email de RH para envio real."
      : `${sent} email(s) enviado(s) com sucesso.`,
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
