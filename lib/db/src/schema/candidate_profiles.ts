import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const candidateProfilesTable = pgTable("candidate_profiles", {
  id: serial("id").primaryKey(),
  resume_id: integer("resume_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  location: text("location"),
  years_experience: integer("years_experience").default(0),
  skills: text("skills").array().notNull().default([]),
  summary: text("summary"),
  strongest_points: text("strongest_points").array().notNull().default([]),
  raw_extracted: jsonb("raw_extracted"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type CandidateProfile = typeof candidateProfilesTable.$inferSelect;
