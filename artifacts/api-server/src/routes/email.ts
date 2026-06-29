import { Router } from "express";
import { db } from "@workspace/db";
import { outboundEmailsTable, resumeTable, jobsTable, applicationsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";

const router = Router();

function buildEmailHtml(
  candidateName: string,
  jobTitle: string,
  company: string,
  coverLetter: string,
  skills: string[]
): string {
  const topSkills = skills.slice(0, 6).join(", ");
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
  .name { font-size: 20px; font-weight: bold; color: #4f46e5; }
  .skills { background: #f5f3ff; border-radius: 8px; padding: 10px 14px; margin: 16px 0; font-size: 14px; }
  .footer { border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 12px; font-size: 12px; color: #9ca3af; }
</style></head>
<body>
  <div class="header">
    <div class="name">${candidateName}</div>
    <div style="font-size:13px;color:#6b7280;">Candidatura para ${jobTitle} — ${company}</div>
  </div>
  <div style="white-space:pre-line;line-height:1.7;">${coverLetter}</div>
  <div class="skills"><strong>Principais competências:</strong> ${topSkills}</div>
  <div class="footer">
    Este email foi enviado via AI Job Agent. Para não receber mais candidaturas desta pessoa, responda com "remover".
  </div>
</body>
</html>`;
}

function buildSubject(candidateName: string, jobTitle: string, company: string): string {
  return `Candidatura: ${jobTitle} — ${candidateName}`;
}

// POST /api/email/apply/:jobId — send real email application for a job
router.post("/email/apply/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const { to_email, to_name } = req.body;
  if (!to_email) { res.status(400).json({ error: "to_email is required" }); return; }

  // Load resume
  const resumeRows = await db.select().from(resumeTable).limit(1);
  if (resumeRows.length === 0) { res.status(404).json({ error: "No resume found" }); return; }
  const resume = resumeRows[0];

  // Load job
  const jobRows = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (jobRows.length === 0) { res.status(404).json({ error: "Job not found" }); return; }
  const job = jobRows[0];

  const skills = resume.skills ?? [];
  const coverLetter = job.cover_letter ?? `Olá,\n\nEstou muito animado com a vaga de ${job.title} na ${job.company}.\n\nMeu perfil é fortemente alinhado com os requisitos — especialmente em ${skills.slice(0, 3).join(", ")}.\n\nFico à disposição para uma conversa!\n\n${resume.name}`;

  const subject = buildSubject(resume.name, job.title, job.company);
  const html = buildEmailHtml(resume.name, job.title, job.company, coverLetter, skills);

  try {
    const { messageId } = await sendEmail({
      to: to_email,
      subject,
      html,
      text: coverLetter,
      replyTo: process.env.SMTP_FROM_EMAIL,
    });

    // Record outbound email
    await db.insert(outboundEmailsTable).values({
      job_id: jobId,
      to_email,
      to_name: to_name ?? null,
      subject,
      body_text: coverLetter,
      body_html: html,
      message_id: messageId,
      status: "sent",
    });

    // Mark job as applied + create application
    await db.update(jobsTable).set({ status: "applied" }).where(eq(jobsTable.id, jobId));

    const existing = await db.select().from(applicationsTable).where(eq(applicationsTable.job_id, jobId));
    if (existing.length === 0) {
      await db.insert(applicationsTable).values({
        job_id: jobId,
        job_title: job.title,
        company: job.company,
        status: "applied",
        notes: `Email enviado para ${to_email} (${to_name ?? "RH"}). MessageID: ${messageId}`,
        salary: job.salary ?? null,
        work_type: job.work_type,
        match_score: job.match_score,
      });
    }

    await db.insert(activityTable).values({
      type: "applied",
      title: job.title,
      company: job.company,
      match_score: job.match_score,
    });

    res.json({ success: true, messageId, to: to_email, subject });
  } catch (err: any) {
    // Log failed attempt
    await db.insert(outboundEmailsTable).values({
      job_id: jobId,
      to_email,
      to_name: to_name ?? null,
      subject,
      body_text: coverLetter,
      body_html: html,
      status: "failed",
      error: err?.message ?? "Unknown error",
    });
    res.status(500).json({ error: "Falha ao enviar email", detail: err?.message });
  }
});

// GET /api/email/sent — list all sent emails
router.get("/email/sent", async (_req, res) => {
  const rows = await db.select().from(outboundEmailsTable).orderBy(outboundEmailsTable.sent_at);
  const sorted = rows.sort((a, b) => (b.sent_at?.getTime() ?? 0) - (a.sent_at?.getTime() ?? 0));
  res.json(sorted);
});

// POST /api/email/test — send a test email to verify SMTP
router.post("/email/test", async (req, res) => {
  const { to } = req.body;
  if (!to) { res.status(400).json({ error: "to is required" }); return; }
  try {
    const { messageId } = await sendEmail({
      to,
      subject: "✅ AI Job Agent — SMTP funcionando",
      text: "Este é um email de teste do AI Job Agent. O SMTP está configurado corretamente.",
      html: "<h2>✅ SMTP funcionando!</h2><p>O AI Job Agent está pronto para enviar candidaturas reais.</p>",
    });
    res.json({ success: true, messageId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
