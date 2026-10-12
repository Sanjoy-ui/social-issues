import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { problemStatements } from "./problemStatement.js";
import { university } from "./university.js";
import { universitySpoc } from "./universitySpoc.js";
import { industryPartners } from "./industryPartner.js";
import { industrySpoc } from "./industrySpoc.js";

/**
 * Model: industry_proposals
 * Stores solution proposals submitted by Industry Partners to Higher Education institutions
 */
export const industryProposals = pgTable("industry_proposals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  problemStatementId: uuid("problem_statement_id")
    .notNull()
    .references(() => problemStatements.id),
  universityId: varchar("university_id", { length: 255 })
    .notNull()
    .references(() => university.universityID),
  industryId: varchar("industry_id", { length: 255 })
    .notNull()
    .references(() => industryPartners.id),
  industrySpocId: varchar("industry_spoc_id", { length: 255 })
    .notNull()
    .references(() => industrySpoc.id),
  proposalTitle: text("proposal_title").notNull(),
  proposalSummary: text("proposal_summary").notNull(),
  contributionType: text("contribution_type").notNull().default("CSR_GRANT"),
  estimatedTimeline: text("estimated_timeline"),
  documentUrl: text("document_url").notNull(),
  documentPublicId: text("document_public_id").notNull(),
  documentName: text("document_name").notNull(),
  documentFormat: text("document_format"),
  // pending | accepted | rejected
  status: text("status").notNull().default("pending"),
  collegeFeedback: text("college_feedback"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBySpocId: varchar("reviewed_by_spoc_id", { length: 255 }).references(() => universitySpoc.spocID),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IndustryProposal = typeof industryProposals.$inferSelect;
export type NewIndustryProposal = typeof industryProposals.$inferInsert;
