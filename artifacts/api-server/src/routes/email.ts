import { Router } from "express";
import { db } from "@workspace/db";
import { outboundEmailsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";
import { checkRateLimit } from "../lib/email-queue";
import { sendApplicationForJob } from "../services/application.service";
import { getUserId } from "../services/user.service";

const router = Router();

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

// GET /api/email/sent — list all sent emails
router.get("/email/sent", async (_req, res) => {
  const rows = await db.select().from(outboundEmailsTable).orderBy(desc(outboundEmailsTable.sent_at));
  res.json(rows);
});

// GET /api/email/rate-limit — check current rate limit status
router.get("/email/rate-limit", async (_req, res) => {
  const info = await checkRateLimit();
  const testMode = process.env.TEST_MODE === "true";
  res.json({ ...info, testMode, testEmail: testMode ? process.env.TEST_EMAIL : undefined });
});

// POST /api/email/test — send a test email
router.post("/email/test", async (req, res) => {
  const { to } = req.body;
  if (!to) { res.status(400).json({ error: "to is required" }); return; }
  try {
    const { messageId } = await sendEmail({
      to,
      subject: "✅ AI Job Agent — SMTP funcionando",
      text: "Este é um email de teste do AI Job Agent. O SMTP Brevo está configurado corretamente.",
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">✅ SMTP funcionando!</h2>
        <p>O <strong>AI Job Agent</strong> está pronto para enviar candidaturas reais via Brevo.</p>
        <p style="color:#6b7280;font-size:13px">Enviado em: ${new Date().toLocaleString("pt-BR")}</p>
      </div>`,
    });
    res.json({ success: true, messageId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
