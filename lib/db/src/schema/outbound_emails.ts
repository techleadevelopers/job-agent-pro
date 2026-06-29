import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const outboundEmailsTable = pgTable("outbound_emails", {
  id: serial("id").primaryKey(),
  application_id: integer("application_id"),
  job_id: integer("job_id"),
  to_email: text("to_email").notNull(),
  to_name: text("to_name"),
  subject: text("subject").notNull(),
  body_text: text("body_text").notNull(),
  body_html: text("body_html").notNull(),
  message_id: text("message_id"),
  status: text("status").notNull().default("sent"),
  sent_at: timestamp("sent_at").defaultNow(),
  error: text("error"),
});

export type OutboundEmail = typeof outboundEmailsTable.$inferSelect;
