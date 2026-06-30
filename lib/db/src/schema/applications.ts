import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().default(1),
  job_id: integer("job_id").notNull(),
  job_title: text("job_title").notNull(),
  company: text("company").notNull(),
  status: text("status").notNull().default("applied"),
  applied_at: timestamp("applied_at").defaultNow(),
  notes: text("notes"),
  salary: integer("salary"),
  work_type: text("work_type").notNull().default("remote"),
  match_score: integer("match_score").notNull().default(0),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, applied_at: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
