import { db } from "@workspace/db";
import {
  jobsTable, applicationsTable, outboundEmailsTable,
  activityTable, emailLogsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";
import { generateApplicationEmail } from "../lib/application-email";
import { checkRateLimit, isAlreadySent } from "../lib/email-queue";
import { getCandidateProfile, getResumeForUser } from "./profile.service";
import { logger } from "../lib/logger";
import fs from "fs";

export interface ApplicationStep {
  step: string;
  status: "ok" | "error" | "skip";
  detail?: string;
}

export interface ApplicationResult {
  success: boolean;
  messageId?: string;
  to?: string;
  subject?: string;
  testMode: boolean;
  steps: ApplicationStep[];
  error?: string;
}

async function logEmailEvent(userId: number, jobId: number, event: string, detail?: string) {
  await db.insert(emailLogsTable).values({ user_id: userId, job_id: jobId, event, detail: detail ?? null }).catch(() => {});
}

export async function sendApplicationForJob(jobId: number, userId: number): Promise<ApplicationResult> {
  const steps: ApplicationStep[] = [];
  const testMode = process.env.TEST_MODE === "true";

  const add = (step: string, status: ApplicationStep["status"], detail?: string) => {
    steps.push({ step, status, detail });
    logger.info({ step, status, detail }, "ApplicationService step");
  };

  add("Preparando candidatura", "ok");

  // 1. Load candidate profile
  const profile = await getCandidateProfile(userId);
  if (!profile || !profile.name.trim()) {
    add("Perfil do candidato", "error", "Nenhum perfil encontrado. Faça upload do currículo.");
    return { success: false, testMode, steps, error: "Perfil não encontrado" };
  }
  add("Perfil do candidato", "ok", `${profile.name} · ${profile.title}`);

  // 2. Load job
  const jobRows = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!jobRows.length) {
    add("Vaga", "error", "Vaga não encontrada");
    return { success: false, testMode, steps, error: "Vaga não encontrada" };
  }
  const job = jobRows[0];

  // 3. Validate match score
  if (job.match_score < 85) {
    add("Match score", "error", `${job.match_score}% < 85% mínimo`);
    return { success: false, testMode, steps, error: `Match ${job.match_score}% abaixo do mínimo (85%)` };
  }
  add("Match score", "ok", `${job.match_score}%`);

  // 4. Validate recruiter email
  const recruiterEmail = job.hr_email;
  if (!recruiterEmail) {
    add("Email do recrutador", "error", "Vaga sem email de contato");
    return { success: false, testMode, steps, error: "Email do recrutador não disponível" };
  }
  add("Email do recrutador", "ok", recruiterEmail);

  // 5. Duplicate check
  const alreadySent = await isAlreadySent(jobId, recruiterEmail);
  if (alreadySent) {
    add("Verificação de duplicata", "skip", "Já enviada para esta empresa");
    return { success: false, testMode, steps, error: "Candidatura já enviada para esta vaga" };
  }
  add("Verificação de duplicata", "ok");

  // 6. Rate limit
  const { allowed, remaining } = await checkRateLimit();
  if (!allowed) {
    add("Rate limit", "error", "Limite de 10 emails/hora atingido");
    return { success: false, testMode, steps, error: "Limite de envio atingido. Tente novamente em breve." };
  }
  add("Rate limit", "ok", `${remaining} restantes nesta hora`);

  // 7. Generate email
  const jobInput = {
    title: job.title,
    company: job.company,
    recruiterEmail,
    description: job.description ?? job.title,
    location: job.location,
    matchScore: job.match_score,
  };
  const { subject, htmlBody, textBody } = generateApplicationEmail(profile, jobInput);
  add("Email gerado", "ok", subject);

  // 8. Attach resume PDF if available
  const resume = await getResumeForUser(userId);
  const attachments: { filename: string; path?: string; contentType: string }[] = [];
  if (resume?.file_path && fs.existsSync(resume.file_path)) {
    attachments.push({
      filename: `${profile.name.replace(/\s+/g, "_")}_Curriculo.pdf`,
      path: resume.file_path,
      contentType: "application/pdf",
    });
    add("Anexando currículo PDF", "ok", resume.filename ?? "curriculo.pdf");
  } else {
    add("Anexando currículo PDF", "skip", "Arquivo PDF não armazenado no servidor");
  }

  // 9. Send
  const finalTo = testMode && process.env.TEST_EMAIL ? process.env.TEST_EMAIL : recruiterEmail;
  add(`Enviando via Brevo SMTP${testMode ? " [MODO TESTE]" : ""}`, "ok", `→ ${finalTo}`);

  await logEmailEvent(userId, jobId, "sending", `to=${finalTo} subject=${subject}`);

  try {
    const { messageId } = await sendEmail({
      to: recruiterEmail,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: attachments.length ? attachments : undefined,
      replyTo: profile.email ?? process.env.SMTP_FROM_EMAIL,
    });

    add("Enviado com sucesso ✓", "ok", `MessageID: ${messageId}`);
    await logEmailEvent(userId, jobId, "sent", messageId);

    // 10. Record in DB
    const [outbound] = await db.insert(outboundEmailsTable).values({
      user_id: userId,
      job_id: jobId,
      to_email: recruiterEmail,
      to_name: job.company,
      subject,
      body_text: textBody,
      body_html: htmlBody,
      message_id: messageId,
      status: "sent",
    }).returning();

    await db.update(jobsTable).set({ status: "applied" }).where(eq(jobsTable.id, jobId));

    const existing = await db.select().from(applicationsTable)
      .where(and(eq(applicationsTable.job_id, jobId), eq(applicationsTable.user_id, userId)));
    if (!existing.length) {
      await db.insert(applicationsTable).values({
        user_id: userId,
        job_id: jobId,
        job_title: job.title,
        company: job.company,
        status: "applied",
        notes: `Email ${testMode ? "de teste " : ""}enviado para ${finalTo}. MessageID: ${messageId}`,
        salary: job.salary ?? null,
        work_type: job.work_type,
        match_score: job.match_score,
      });
    }

    await db.insert(activityTable).values({
      user_id: userId,
      type: "applied",
      title: job.title,
      company: job.company,
      match_score: job.match_score,
    });

    return { success: true, messageId, to: finalTo, subject, testMode, steps };
  } catch (err: any) {
    add(`Falhou: ${err?.message ?? "erro desconhecido"}`, "error");
    await logEmailEvent(userId, jobId, "failed", err?.message);
    await db.insert(outboundEmailsTable).values({
      user_id: userId, job_id: jobId,
      to_email: recruiterEmail, to_name: job.company,
      subject, body_text: textBody, body_html: htmlBody,
      status: "failed", error: err?.message ?? "Unknown error",
    }).catch(() => {});
    return { success: false, testMode, steps, error: err?.message };
  }
}
