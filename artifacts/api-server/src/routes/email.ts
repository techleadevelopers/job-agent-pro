import { Router } from "express";
import { db } from "@workspace/db";
import { outboundEmailsTable, resumeTable, jobsTable, applicationsTable, activityTable, candidateProfilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";
import { generateApplicationEmail } from "../lib/application-email";
import { checkRateLimit, isAlreadySent } from "../lib/email-queue";
import { logger } from "../lib/logger";
import fs from "fs";
import path from "path";

const router = Router();

const RESUME_STORAGE_DIR = process.env.RESUME_STORAGE_DIR ?? "/tmp/resumes";

function getResumePath(filename: string): string | null {
  const filePath = path.join(RESUME_STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

router.post("/email/apply/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const steps: { step: string; status: "ok" | "error"; detail?: string }[] = [];

  const addStep = (step: string, status: "ok" | "error", detail?: string) => {
    steps.push({ step, status, detail });
    logger.info({ step, status, detail }, "email-apply step");
  };

  try {
    addStep("Preparando email", "ok");

    const resumeRows = await db.select().from(resumeTable).limit(1);
    if (resumeRows.length === 0) {
      addStep("Verificando currículo", "error", "Nenhum currículo encontrado");
      res.status(404).json({ error: "Currículo não encontrado", steps }); return;
    }
    const resume = resumeRows[0];

    const profileRows = await db.select().from(candidateProfilesTable).orderBy(desc(candidateProfilesTable.created_at)).limit(1);
    if (profileRows.length === 0) {
      addStep("Verificando perfil do candidato", "error", "Perfil estruturado não encontrado. Faça o upload do currículo novamente.");
      res.status(404).json({ error: "Perfil do candidato não encontrado. Faça o upload do currículo.", steps }); return;
    }
    const profileRow = profileRows[0];

    if (!profileRow.name || profileRow.name.trim() === "") {
      addStep("Verificando nome do candidato", "error", "Nome não extraído do currículo");
      res.status(400).json({ error: "Nome do candidato não encontrado no currículo", steps }); return;
    }
    addStep("Verificando perfil do candidato", "ok", `Candidato: ${profileRow.name}`);

    const jobRows = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    if (jobRows.length === 0) {
      addStep("Verificando vaga", "error", "Vaga não encontrada");
      res.status(404).json({ error: "Vaga não encontrada", steps }); return;
    }
    const job = jobRows[0];

    if (job.match_score < 85) {
      addStep("Verificando match score", "error", `Match ${job.match_score}% < 85% mínimo`);
      res.status(400).json({ error: `Match score ${job.match_score}% abaixo do mínimo (85%)`, steps }); return;
    }
    addStep("Verificando match score", "ok", `Match: ${job.match_score}%`);

    const recruiterEmail = (job as any).hr_email;
    if (!recruiterEmail) {
      addStep("Verificando email do recrutador", "error", "hr_email não cadastrado para esta vaga");
      res.status(400).json({ error: "Email do recrutador não encontrado para esta vaga", steps }); return;
    }
    addStep("Verificando email do recrutador", "ok", `Para: ${recruiterEmail}`);

    const testMode = process.env.TEST_MODE === "true";
    const testEmail = process.env.TEST_EMAIL;
    const finalTo = testMode && testEmail ? testEmail : recruiterEmail;

    const alreadySent = await isAlreadySent(jobId, recruiterEmail);
    if (alreadySent) {
      addStep("Verificando duplicata", "error", `Candidatura já enviada para ${recruiterEmail}`);
      res.status(409).json({ error: "Candidatura já enviada para esta empresa/email", steps }); return;
    }
    addStep("Verificando duplicata", "ok");

    const { allowed, sentLastHour, remaining } = await checkRateLimit();
    if (!allowed) {
      addStep("Verificando rate limit", "error", `Limite de 10 emails/hora atingido (${sentLastHour} enviados)`);
      res.status(429).json({ error: "Limite de 10 emails por hora atingido. Tente novamente em breve.", steps }); return;
    }
    addStep("Verificando rate limit", "ok", `${remaining} emails restantes nesta hora`);

    const profile = {
      name: profileRow.name,
      email: profileRow.email ?? undefined,
      phone: profileRow.phone ?? undefined,
      title: profileRow.title ?? "Software Engineer",
      location: profileRow.location ?? undefined,
      yearsExperience: profileRow.years_experience ?? 5,
      skills: profileRow.skills ?? [],
      summary: profileRow.summary ?? undefined,
      strongestPoints: profileRow.strongest_points ?? [],
    };

    const jobInput = {
      title: job.title,
      company: job.company,
      recruiterEmail,
      description: job.description ?? job.title,
      location: job.location,
      matchScore: job.match_score,
    };

    const { subject, htmlBody, textBody } = generateApplicationEmail(profile, jobInput);
    addStep("Gerando email personalizado", "ok", `Assunto: ${subject}`);

    const attachments: { filename: string; path?: string; content?: Buffer; contentType: string }[] = [];
    if (resume.filename) {
      const resumePath = getResumePath(resume.filename);
      if (resumePath) {
        attachments.push({
          filename: `${profile.name.replace(/\s+/g, "_")}_Curriculo.pdf`,
          path: resumePath,
          contentType: "application/pdf",
        });
        addStep("Anexando currículo PDF", "ok", resume.filename);
      } else {
        addStep("Anexando currículo PDF", "ok", "Arquivo PDF não disponível (sem anexo)");
      }
    } else {
      addStep("Anexando currículo PDF", "ok", "Sem arquivo PDF armazenado");
    }

    addStep(`Enviando via Brevo SMTP${testMode ? " (MODO TESTE)" : ""}`, "ok", `→ ${finalTo}`);

    const { messageId } = await sendEmail({
      to: recruiterEmail,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: attachments.length > 0 ? attachments : undefined,
      replyTo: process.env.SMTP_FROM_EMAIL,
    });

    addStep("Enviado com sucesso", "ok", `MessageID: ${messageId}`);

    await db.insert(outboundEmailsTable).values({
      job_id: jobId,
      to_email: recruiterEmail,
      to_name: job.company,
      subject,
      body_text: textBody,
      body_html: htmlBody,
      message_id: messageId,
      status: "sent",
    });

    await db.update(jobsTable).set({ status: "applied" }).where(eq(jobsTable.id, jobId));

    const existing = await db.select().from(applicationsTable).where(eq(applicationsTable.job_id, jobId));
    if (existing.length === 0) {
      await db.insert(applicationsTable).values({
        job_id: jobId,
        job_title: job.title,
        company: job.company,
        status: "applied",
        notes: `Email enviado para ${finalTo}${testMode ? " (MODO TESTE)" : ""}. MessageID: ${messageId}`,
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

    res.json({
      success: true,
      messageId,
      to: finalTo,
      subject,
      testMode,
      steps,
    });

  } catch (err: any) {
    addStep("Falhou", "error", err?.message ?? "Erro desconhecido");
    logger.error({ err }, "email-apply failed");

    try {
      const jobRows = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
      const job = jobRows[0];
      if (job) {
        await db.insert(outboundEmailsTable).values({
          job_id: jobId,
          to_email: (job as any).hr_email ?? "unknown",
          to_name: job.company,
          subject: `Candidatura — ${job.title}`,
          body_text: "",
          body_html: "",
          status: "failed",
          error: err?.message ?? "Unknown error",
        });
      }
    } catch (_) {}

    res.status(500).json({ error: "Falha ao enviar email", detail: err?.message, steps });
  }
});

router.get("/email/sent", async (_req, res) => {
  const rows = await db.select().from(outboundEmailsTable).orderBy(desc(outboundEmailsTable.sent_at));
  res.json(rows);
});

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

router.get("/email/rate-limit", async (_req, res) => {
  const info = await checkRateLimit();
  const testMode = process.env.TEST_MODE === "true";
  const testEmail = process.env.TEST_EMAIL;
  res.json({ ...info, testMode, testEmail: testMode ? testEmail : undefined });
});

export default router;
