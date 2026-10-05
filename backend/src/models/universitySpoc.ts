import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { university } from "./university.js";

export const universitySpoc = pgTable("university_spoc", {
  spocID: varchar("spocID", { length: 255 }).primaryKey(),
  universityID: varchar("universityID", { length: 255 }).references(() => university.universityID),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  universityEmail: text("universityEmail").unique().notNull(),
  passwordHash: text("passwordHash").notNull(),
  refreshToken: text("refreshToken"),
  positionTitle: text("positionTitle"),
  departmentSpoc: text("departmentSpoc"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type UniversitySpoc = typeof universitySpoc.$inferSelect;
export type NewUniversitySpoc = typeof universitySpoc.$inferInsert;
