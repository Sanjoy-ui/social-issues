import { pgTable, uuid, text, real, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { problemStatements } from "./problemStatement.js";

/**
 * Task 5: ps_issue_links
 * Links a Problem Statement to the individual civic issues that evidence it
 */
export const psIssueLinks = pgTable("ps_issue_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  psId: uuid("ps_id")
    .notNull()
    .references(() => problemStatements.id, { onDelete: "cascade" }),
  issueId: text("issue_id").notNull(),    // FK → MongoDB issue.id
  similarityScore: real("similarity_score"),
  linkedAt: timestamp("linked_at").defaultNow(),
});

export type PsIssueLink = typeof psIssueLinks.$inferSelect;
export type NewPsIssueLink = typeof psIssueLinks.$inferInsert;
