import { Router } from "express";
import { db } from "@workspace/db";
import { outboundEmailsTable, emailLogsTable, resumeTable, candidateProfilesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";
import { checkRateLimit } from "../lib/email-queue";
import { sendApplicationForJob } from "../services/application.service";
import { generateApplicationEmail } from "../lib/application-email";
import { getCandidateProfile, getResumeForUser } from "../services/profile.service";
import { getUserId } from "../services/user.service";
import fs from "fs";

const router = Router();

// GET /api/email/smtp-status — full SMTP diagnostics + test gate status
router.get("/email/smtp-status", async (req, res) => {
  const userId = getUserId(req);

  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM_EMAIL
  );

  const testMode = process.env.TEST_MODE === "true";
  const testEmail = process.env.TEST_EMAIL ?? null;

  // Check resume + PDF attachment
  const resume = await getResumeForUser(userId);
  const hasPdf = !!(resume?.file_path && fs.existsSync(resume.file_path));

  // Check candidate profile for email preview
  const profile = await getCandidateProfile(userId);

  let emailPreview: { subject: string; bodySnippet: string } | null = null;
  if (profile) {
    try {
      const { subject, textBody } = generateApplicationEmail(profile, {
        title: "Backend Engineer",
        company: "Empresa Exemplo",
        recruiterEmail: testEmail ?? "rh@empresa.com",
        description: "Vaga de backend com Python e Go",
        matchScore: 95,
      });
      emailPreview = {
        subject,
        bodySnippet: textBody.slice(0, 400),
      };
    } catch { /* ignore */ }
  }

  // Last successful test (test emails sent to TEST_EMAIL)
  const lastTests = await db
    .select()
    .from(outboundEmailsTable)
    .where(eq(outboundEmailsTable.user_id, userId))
    .orderBy(desc(outboundEmailsTable.sent_at))
    .limit(5);

  const successfulTests = lastTests.filter(t => t.status === "sent");
  const testGatePassed = successfulTests.length > 0;
  const lastTest = lastTests[0] ?? null;

  // Email logs
  const logs = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.user_id, userId))
    .orderBy(desc(emailLogsTable.logged_at))
    .limit(10);

  res.json({
    smtp: {
      configured: smtpConfigured,
      host: process.env.SMTP_HOST ?? null,
      user: process.env.SMTP_USER ?? null,
      from: process.env.SMTP_FROM_EMAIL ?? null,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      missing: [
        !process.env.SMTP_HOST && "SMTP_HOST",
        !process.env.SMTP_USER && "SMTP_USER",
        !process.env.SMTP_PASS && "SMTP_PASS",
        !process.env.SMTP_FROM_EMAIL && "SMTP_FROM_EMAIL",
      ].filter(Boolean),
    },
    test_mode: testMode,
    test_email: testEmail,
    resume: {
      found: !!resume,
      name: resume?.name ?? null,
      has_pdf: hasPdf,
      filename: resume?.filename ?? null,
    },
    profile: {
      found: !!profile,
      name: profile?.name ?? null,
      title: profile?.title ?? null,
    },
    email_preview: emailPreview,
    test_gate: {
      passed: testGatePassed,
      successful_tests: successfulTests.length,
      required: 1,
      message: testGatePassed
        ? `✓ ${successfulTests.length} teste(s) enviado(s) com sucesso — envio em lote liberado`
        : "Envie ao menos 1 email de teste real antes de liberar o envio em lote",
    },
    last_test: lastTest ? {
      id: lastTest.id,
      to: lastTest.to_email,
      subject: lastTest.subject,
      status: lastTest.status,
      message_id: lastTest.message_id ?? null,
      sent_at: lastTest.sent_at?.toISOString() ?? null,
      error: lastTest.error ?? null,
    } : null,
    recent_logs: logs.map(l => ({
      id: l.id,
      event: l.event,
      detail: l.detail ?? null,
      logged_at: l.logged_at?.toISOString() ?? null,
    })),
  });
});

// POST /api/email/apply/:jobId — full application flow via ApplicationService
router.post("/email/apply/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const userId = getUserId(req);
  const result = await sendApplicationForJob(jobId, userId);

  if (!result.success) {
    const statusCode = result.error?.includes("já enviada") ? 409
      : result.error?.includes("Limite") ? 429
      : result.error?.includes("Perfil") || result.error?.includes("Vaga") ? 404
      : 500;
    res.status(statusCode).json({ error: result.error, steps: result.steps });
    return;
  }

  res.json(result);
});

// GET /api/email/sent — list all sent outbound emails
router.get("/email/sent", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(outboundEmailsTable)
    .where(eq(outboundEmailsTable.user_id, userId))
    .orderBy(desc(outboundEmailsTable.sent_at));
  res.json(rows);
});

// GET /api/email/logs — get email activity logs
router.get("/email/logs", async (req, res) => {
  const userId = getUserId(req);
  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 100);
  const rows = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.user_id, userId))
    .orderBy(desc(emailLogsTable.logged_at))
    .limit(limit);
  res.json(rows.map(l => ({
    id: l.id,
    event: l.event,
    detail: l.detail ?? null,
    job_id: l.job_id ?? null,
    logged_at: l.logged_at?.toISOString() ?? null,
  })));
});

// GET /api/email/rate-limit — check current rate limit status
router.get("/email/rate-limit", async (_req, res) => {
  const info = await checkRateLimit();
  const testMode = process.env.TEST_MODE === "true";
  res.json({ ...info, testMode, testEmail: testMode ? process.env.TEST_EMAIL : undefined });
});

// POST /api/email/test — send a real test email
router.post("/email/test", async (req, res) => {
  const userId = getUserId(req);
  const testEmail = process.env.TEST_EMAIL;
  const toOverride = req.body?.to as string | undefined;
  const to = toOverride ?? testEmail;

  if (!to) {
    res.status(400).json({ error: "TEST_EMAIL não configurado e nenhum destinatário fornecido" });
    return;
  }

  // Check SMTP config
  if (!process.env.SMTP_PASS) {
    res.status(503).json({ error: "SMTP_PASS não configurado. Configure o secret SMTP_PASS no painel de segredos." });
    return;
  }

  // Get profile for personalized preview
  const profile = await getCandidateProfile(userId);
  const resume = await getResumeForUser(userId);
  const hasPdf = !!(resume?.file_path && fs.existsSync(resume.file_path));

  const attachments: { filename: string; path: string; contentType: string }[] = [];
  if (hasPdf && resume?.file_path) {
    attachments.push({
      filename: `${(profile?.name ?? "curriculo").replace(/\s+/g, "_")}_Curriculo.pdf`,
      path: resume.file_path,
      contentType: "application/pdf",
    });
  }

  const subject = `✅ AI Job Agent — Teste SMTP [${new Date().toLocaleString("pt-BR")}]`;
  const candidateName = profile?.name ?? "Candidato";
  const candidateSkills = (profile?.skills ?? []).slice(0, 5).join(", ") || "N/A";

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8">
<style>
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#f8f9fa;margin:0;padding:0}
.wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px 28px}
.header-title{font-size:22px;font-weight:700;color:#fff;margin:0 0 4px}
.header-sub{font-size:13px;color:rgba(255,255,255,0.8);margin:0}
.body{padding:32px 40px}
.badge{display:inline-block;background:#dcfce7;color:#166534;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-bottom:20px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px}
.row:last-child{border:none}
.label{color:#6b7280;font-weight:500}
.value{color:#111827;font-weight:600;text-align:right}
.ok{color:#16a34a}
.warn{color:#ca8a04}
.footer{background:#f8f9fa;padding:16px 40px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f0f0f5}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="header-title">✅ Teste SMTP — Sucesso!</div>
    <div class="header-sub">AI Job Agent · ${new Date().toLocaleString("pt-BR")}</div>
  </div>
  <div class="body">
    <span class="badge">🔒 SMTP Brevo funcionando</span>
    <div class="row"><span class="label">Candidato</span><span class="value">${candidateName}</span></div>
    <div class="row"><span class="label">Competências detectadas</span><span class="value">${candidateSkills}</span></div>
    <div class="row"><span class="label">Modo</span><span class="value">${process.env.TEST_MODE === "true" ? "🧪 TESTE" : "🚀 PRODUÇÃO"}</span></div>
    <div class="row"><span class="label">Destinatário real</span><span class="value">${to}</span></div>
    <div class="row"><span class="label">Currículo PDF anexado</span><span class="value ${hasPdf ? "ok" : "warn"}">${hasPdf ? "✓ Sim" : "⚠ Não encontrado"}</span></div>
    <div class="row"><span class="label">SMTP Host</span><span class="value">${process.env.SMTP_HOST ?? "N/A"}</span></div>
    <div class="row"><span class="label">SMTP Porta</span><span class="value">${process.env.SMTP_PORT ?? "587"}</span></div>
  </div>
  <div class="footer">Este é um email de diagnóstico do AI Job Agent. Não responda.</div>
</div>
</body>
</html>`;

  const textBody = `✅ AI Job Agent — SMTP funcionando!\n\nCandidato: ${candidateName}\nCompetências: ${candidateSkills}\nPDF anexado: ${hasPdf ? "Sim" : "Não"}\n\nEnviado em: ${new Date().toLocaleString("pt-BR")}`;

  try {
    const { messageId } = await sendEmail({
      to,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: attachments.length ? attachments : undefined,
    });

    // Record in outbound_emails so test gate can check it
    await db.insert(outboundEmailsTable).values({
      user_id: userId,
      to_email: to,
      to_name: "Teste SMTP",
      subject,
      body_text: textBody,
      body_html: htmlBody,
      message_id: messageId,
      status: "sent",
    });

    // Log it
    await db.insert(emailLogsTable).values({
      user_id: userId,
      event: "test_sent",
      detail: `messageId=${messageId} to=${to} pdf=${hasPdf}`,
    }).catch(() => {});

    res.json({
      success: true,
      messageId,
      to,
      subject,
      has_pdf: hasPdf,
      test_mode: process.env.TEST_MODE === "true",
      message: `Email de teste enviado com sucesso para ${to}`,
    });
  } catch (err: any) {
    await db.insert(emailLogsTable).values({
      user_id: userId,
      event: "test_failed",
      detail: err?.message ?? "erro desconhecido",
    }).catch(() => {});

    res.status(500).json({
      success: false,
      error: err?.message ?? "Erro ao enviar email",
      smtp_hint: !process.env.SMTP_PASS
        ? "SMTP_PASS não configurado"
        : err?.message?.includes("Invalid login")
        ? "Credenciais SMTP inválidas — verifique SMTP_USER e SMTP_PASS"
        : null,
    });
  }
});

export default router;
