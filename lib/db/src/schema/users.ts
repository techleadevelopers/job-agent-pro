import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
