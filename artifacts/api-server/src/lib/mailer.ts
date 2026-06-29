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
  attachments?: { filename: string; content: Buffer | string; contentType: string }[];
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ messageId: string }> {
  const from = `"${process.env.SMTP_FROM_NAME ?? "AI Job Agent"}" <${process.env.SMTP_FROM_EMAIL}>`;
  const info = await transporter.sendMail({
    from,
    to: opts.to,
    replyTo: opts.replyTo ?? process.env.SMTP_FROM_EMAIL,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: opts.attachments,
  });
  return { messageId: info.messageId };
}
