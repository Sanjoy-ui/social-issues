import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { industryPartners } from "./industryPartner.js";

export const industrySpoc = pgTable("industry_spoc", {
  id: varchar("id", { length: 255 }).primaryKey(),
  industryId: varchar("industry_id", { length: 255 })
    .references(() => industryPartners.id, { onDelete: "cascade" })
    .notNull(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  email: text("email").unique().notNull(), // Corporate email used for login
  passwordHash: text("password_hash").notNull(),
  refreshToken: text("refresh_token"),
  
  designation: text("designation"),
  phone: text("phone"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IndustrySpoc = typeof industrySpoc.$inferSelect;
export type NewIndustrySpoc = typeof industrySpoc.$inferInsert;
