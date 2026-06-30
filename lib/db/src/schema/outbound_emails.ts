import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const outboundEmailsTable = pgTable("outbound_emails", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().default(1),
  application_id: integer("application_id"),
  job_id: integer("job_id"),
  to_email: text("to_email").notNull(),
  to_name: text("to_name"),
  subject: text("subject").notNull(),
  body_text: text("body_text").notNull(),
  body_html: text("body_html").notNull(),
  message_id: text("message_id"),
  status: text("status").notNull().default("pending"),
  retry_count: integer("retry_count").notNull().default(0),
  sent_at: timestamp("sent_at").defaultNow(),
  error: text("error"),
});

export type OutboundEmail = typeof outboundEmailsTable.$inferSelect;
