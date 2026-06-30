import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const preferencesTable = pgTable("preferences", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().default(1),
  work_type: text("work_type").notNull().default("remote"),
  city: text("city"),
  roles: text("roles").array().notNull().default([]),
  min_salary: integer("min_salary"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertPreferencesSchema = createInsertSchema(preferencesTable).omit({ id: true, updated_at: true });
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
export type Preferences = typeof preferencesTable.$inferSelect;
