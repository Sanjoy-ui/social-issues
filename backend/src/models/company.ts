import { pgTable, text, varchar } from "drizzle-orm/pg-core";

export const company = pgTable("company", {
  companyID: varchar("companyID", { length: 255 }).primaryKey(),
  legalEntityName: text("legalEntityName"),
  companyType: text("companyType"),
  industryType: text("industryType"),
  companyEmail: text("companyEmail"),
  companyWebsite: text("companyWebsite"),
  registrationNumber: text("registrationNumber"),
  taxIdentifier: text("taxIdentifier"),
  onboardingStatus: text("onboardingStatus"),
});

export type Company = typeof company.$inferSelect;
export type NewCompany = typeof company.$inferInsert;
