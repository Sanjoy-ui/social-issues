import { pgTable, text, varchar, boolean, date } from "drizzle-orm/pg-core";

export const issue = pgTable("issue", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: text("username"),
  email: text("email"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  issue_title: text("issue_title"),
  issue_description: text("issue_description"),
  issue_proof: text("issue_proof").array(),
  annonymous: boolean("annonymous"),
  address: text("address"),
  createdAt: date("createdAt").defaultNow(),
  updatedAt: date("updatedAt").defaultNow(),
  issue_fk: text("issue_fk"),
});

export type Issue = typeof issue.$inferSelect;
export type NewIssue = typeof issue.$inferInsert;
