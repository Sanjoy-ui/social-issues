import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * agent_runs
 * Audit log of every agent pipeline execution — Gate 1, Gate 2, decisions, duration
 * FIX H8: Added run_id for end-to-end tracing
 * FIX M2: Added gate2_decision (spec vocabulary: VECTOR_ONLY / WATCHLIST / PASS)
 * FIX M10: Added run_logs to persist the full state.logs[] trace
 */
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: text("run_id"),                // FIX H8: unique per pipeline invocation
  issueId: text("issue_id"),            // FK → MongoDB issue.id
  psId: uuid("ps_id"),                  // FK → problem_statements.id (nullable)
  gate1Result: boolean("gate1_result"),
  gate1Reasoning: text("gate1_reasoning"),
  gate2Case: text("gate2_case"),        // A | B | C | E | skipped
  gate2Decision: text("gate2_decision"), // VECTOR_ONLY | WATCHLIST | PASS
  reasoningSummary: text("reasoning_summary"),
  modelUsed: text("model_used"),
  promptVersion: text("prompt_version"), // FIX M9: versioned prompt tracking
  researchScores: text("research_scores"), // FIX M1: serialized 5 research scores
  industryScores: text("industry_scores"), // FIX M1: serialized 5 industry scores
  durationMs: integer("duration_ms"),
  runLogs: text("run_logs"),            // FIX M10: full state.logs trace
  createdAt: timestamp("created_at").defaultNow(),
});


export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
