import { db } from "@workspace/db";
import { outboundEmailsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { logger } from "./logger";

const MAX_PER_HOUR = 10;

export async function countSentLastHour(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(outboundEmailsTable)
    .where(
      and(
        eq(outboundEmailsTable.status, "sent"),
        gte(outboundEmailsTable.sent_at, oneHourAgo)
      )
    );
  return Number(rows[0]?.count ?? 0);
}

export async function isAlreadySent(jobId: number, toEmail: string): Promise<boolean> {
  const rows = await db
    .select({ id: outboundEmailsTable.id })
    .from(outboundEmailsTable)
    .where(
      and(
        eq(outboundEmailsTable.job_id, jobId),
        eq(outboundEmailsTable.to_email, toEmail),
        eq(outboundEmailsTable.status, "sent")
      )
    );
  return rows.length > 0;
}

export async function checkRateLimit(): Promise<{ allowed: boolean; sentLastHour: number; remaining: number }> {
  const sentLastHour = await countSentLastHour();
  const remaining = Math.max(0, MAX_PER_HOUR - sentLastHour);
  return { allowed: remaining > 0, sentLastHour, remaining };
}
