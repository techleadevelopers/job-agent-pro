import nodemailer from "nodemailer";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT ?? "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

export async function verifySmtp(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info("SMTP connection verified");
    return true;
  } catch (err) {
    logger.error({ err }, "SMTP connection failed");
    return false;
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content?: Buffer | string; path?: string; contentType?: string }[];
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions, retries = 2): Promise<{ messageId: string }> {
  const testMode = process.env.TEST_MODE === "true";
  const testEmail = process.env.TEST_EMAIL;
  const actualTo = testMode && testEmail ? testEmail : opts.to;
  const from = `"${process.env.SMTP_FROM_NAME ?? "AI Job Agent"}" <${process.env.SMTP_FROM_EMAIL}>`;

  const subjectPrefix = testMode && testEmail && testEmail !== opts.to ? `[TESTE → ${opts.to}] ` : "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from,
        to: actualTo,
        replyTo: opts.replyTo ?? process.env.SMTP_FROM_EMAIL,
        subject: subjectPrefix + opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments,
      });
      logger.info({ messageId: info.messageId, to: actualTo, testMode }, "Email sent");
      return { messageId: info.messageId };
    } catch (err: any) {
      logger.warn({ err: err.message, attempt }, "Email send attempt failed");
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}
