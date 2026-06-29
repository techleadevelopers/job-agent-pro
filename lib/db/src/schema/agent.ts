import { pgTable, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentTable = pgTable("agent", {
  id: serial("id").primaryKey(),
  running: boolean("running").notNull().default(false),
  jobs_scanned_today: integer("jobs_scanned_today").notNull().default(0),
  applications_today: integer("applications_today").notNull().default(0),
  last_run_at: timestamp("last_run_at"),
});

export const insertAgentSchema = createInsertSchema(agentTable).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentTable.$inferSelect;
