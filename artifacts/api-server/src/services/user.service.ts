import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import type { Request } from "express";

export const DEFAULT_USER_ID = 1;

export function getUserId(_req?: Request): number {
  // V1: single user. Future: extract from JWT/session.
  return DEFAULT_USER_ID;
}

export async function getOrCreateDefaultUser() {
  const rows = await db.select().from(usersTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [inserted] = await db.insert(usersTable).values({
    email: process.env.SMTP_FROM_EMAIL ?? "admin@aijobagent.local",
    name: "Admin",
    role: "admin",
  }).returning();
  return inserted;
}
