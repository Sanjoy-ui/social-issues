import { pgTable, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { industryTypeEnum, industryContributionTypeEnum } from "./industryEnums.js";

export const industryPartners = pgTable("industry_partners", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: text("name").notNull(),
  type: industryTypeEnum("type").notNull(),
  
  // Theme/sector tags matching problem statement categories (e.g. ['Clean Energy', 'Healthcare', 'Waste Management'])
  sectorTags: text("sector_tags").array().notNull(),
  
  // Array of contributions offered (e.g. ['funding', 'mentorship', 'prototyping'])
  contributionTypes: industryContributionTypeEnum("contribution_types").array().notNull(),
  
  // Districts / cities where industry operates or deploys solutions
  operatingDistricts: text("operating_districts").array(),
  location: text("location"),
  
  // Structured contact information
  contactDetails: jsonb("contact_details").$type<{
    website?: string;
    phone?: string;
    officialEmail?: string;
    registrationNumber?: string;
  }>(),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IndustryPartner = typeof industryPartners.$inferSelect;
export type NewIndustryPartner = typeof industryPartners.$inferInsert;
