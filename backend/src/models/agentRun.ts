import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Task 6: agent_runs
 * Audit log of every agent pipeline execution — Gate 1, Gate 2, decisions, duration
 */
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: text("issue_id"),            // FK → MongoDB issue.id
  psId: uuid("ps_id"),                  // FK → problem_statements.id (nullable)
  gate1Result: boolean("gate1_result"),
  gate1Reasoning: text("gate1_reasoning"),
  gate2Case: text("gate2_case"),        // A | B | C | E | skipped
  reasoningSummary: text("reasoning_summary"),
  modelUsed: text("model_used"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
