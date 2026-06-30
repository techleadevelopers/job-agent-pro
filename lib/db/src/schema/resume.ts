import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeTable = pgTable("resume", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  email: text("email"),
  raw_text: text("raw_text").notNull(),
  filename: text("filename"),
  file_path: text("file_path"),
  skills: text("skills").array().notNull().default([]),
  experience_years: integer("experience_years").default(0),
  summary: text("summary"),
  analyzed_at: timestamp("analyzed_at").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertResumeSchema = createInsertSchema(resumeTable).omit({ id: true, analyzed_at: true, created_at: true });
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumeTable.$inferSelect;
