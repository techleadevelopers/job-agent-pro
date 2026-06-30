import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().default(1),
  outbound_email_id: integer("outbound_email_id"),
  job_id: integer("job_id"),
  event: text("event").notNull(),
  detail: text("detail"),
  logged_at: timestamp("logged_at").defaultNow(),
});

export type EmailLog = typeof emailLogsTable.$inferSelect;
