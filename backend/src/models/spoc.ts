import { pgTable, text, varchar, boolean } from "drizzle-orm/pg-core";
import { company } from "./company.js";

export const spoc = pgTable("spoc", {
  spocID: varchar("spocID", { length: 255 }).primaryKey(),
  companyID: varchar("companyID", { length: 255 }).references(() => company.companyID),
  fullName: text("fullName"),
  designation: text("designation"),
  email: text("email"),
  phoneNumber: text("phoneNumber"),
  isPrimary: boolean("isPrimary"),
});

export type Spoc = typeof spoc.$inferSelect;
export type NewSpoc = typeof spoc.$inferInsert;
