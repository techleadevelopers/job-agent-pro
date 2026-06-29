import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull().default("BR"),
  work_type: text("work_type").notNull().default("remote"),
  salary: integer("salary"),
  salary_text: text("salary_text"),
  match_score: integer("match_score").notNull().default(0),
  skills_match: text("skills_match").array().notNull().default([]),
  skills_missing: text("skills_missing").array().notNull().default([]),
  description: text("description"),
  url: text("url"),
  hr_email: text("hr_email"),
  status: text("status").notNull().default("pending"),
  cover_letter: text("cover_letter"),
  found_at: timestamp("found_at").defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, found_at: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
