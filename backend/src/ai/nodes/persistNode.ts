import { pool } from "../../config/db.js";
import { Issue } from "../../models/issue.js";
import { agentConfig } from "../config/agent.config.js";
import type { AgentState } from "../graph/state.js";

/**
 * Node 6: Persist Outcome
 * - Case A: Links issue to existing PS + increments evidence_count
 * - Case B/E: Creates new problem_statements row + ps_embeddings + ps_issue_links (or merges if dedup matched)
 * - Case C: Marks MongoDB issue agent_status = 'unassigned'
 * - FIX H8: Records run_id in final agent_runs row for end-to-end tracing
 * - FIX H3: Persists urgent_escalation flag on problem_statement
 * - FIX M2: Persists track (RESEARCH / INDUSTRY / HYBRID)
 * - FIX M10: Persists full state.logs[] to agent_runs.run_logs
 * - Emits Postgres NOTIFY ps_events for real-time SSE dispatch
 * - FIX M5: Agent_runs insert is the FINAL row for this run — Gate 1/Gate 2 audit rows
 *   use the same run_id so all rows for one invocation are grouped.
 */
export async function persistNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const runId = state.runId;
  const startTime = Date.now();
  const caseDecision = state.gate2?.caseDecision || "C";
  const client = await pool.connect();

  let finalPsId: string | null = null;
  let actionTaken = "";

  try {
    await client.query("BEGIN");

    // Check if synthesis detected a dedup match with an existing PS
    const dedupPsId = state.problemStatement?.dedupMatchedPsId;
    const isMergeCase =
      caseDecision === "A" ||
      (Boolean(dedupPsId) && (caseDecision === "B" || caseDecision === "E"));

    // ── CASE A (or Dedup Merge): Link to Existing PS ─────────────────────────
    if (isMergeCase) {
      finalPsId = (state.gate2?.matchedPsId || dedupPsId) as string;

      // 1. Insert ps_issue_link (ignore if already linked)
      await client.query(
        `
        INSERT INTO ps_issue_links (ps_id, issue_id, similarity_score)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        `,
        [finalPsId, issueId, 0.85]
      );

      // 2. Increment evidence_count on problem_statements
      await client.query(
        `
        UPDATE problem_statements
        SET evidence_count = evidence_count + 1, updated_at = NOW()
        WHERE id = $1
        `,
        [finalPsId]
      );

      // 3. Update MongoDB Issue status
      await Issue.updateOne(
        { id: issueId },
        { $set: { agent_status: "clustered" } }
      );

      // 4. Emit Postgres NOTIFY
      const notifyPayload = JSON.stringify({
        run_id: runId,
        ps_id: finalPsId,
        type: "updated",
        issue_id: issueId,
        timestamp: new Date().toISOString(),
      });
      await client.query(`SELECT pg_notify('ps_events', $1)`, [notifyPayload]);

      actionTaken = `Linked issue ${issueId} to existing PS ${finalPsId} (evidence count incremented)`;
    }

    // ── CASE B / CASE E: Create New Problem Statement ─────────────────────────
    else if ((caseDecision === "B" || caseDecision === "E") && state.problemStatement) {
      const ps = state.problemStatement;
      const evidenceIds = state.gate2?.evidenceIssueIds || [issueId];
      const isUrgent = state.urgentEscalation || state.gate2?.urgentEscalation || false;

      // 1. Insert into problem_statements
      const insertPsRes = await client.query(
        `
        INSERT INTO problem_statements (
          title,
          statement_text,
          category,
          status,
          confidence,
          evidence_count,
          affected_area,
          solution_domain,
          target_institution_type,
          track,
          urgent_escalation,
          version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        `,
        [
          ps.title,
          ps.statementText,
          ps.category,
          "pending_review",
          ps.confidence,
          ps.evidenceCount,
          ps.affectedArea || null,
          ps.solutionDomain,
          ps.targetInstitutionType,
          ps.track,          // FIX M2
          isUrgent,          // FIX H3
          1,
        ]
      );

      finalPsId = insertPsRes.rows[0].id;

      // 2. Insert into ps_embeddings with 1024-dim vector
      if (ps.embedding && ps.embedding.length > 0) {
        const vectorStr = `[${ps.embedding.join(",")}]`;
        await client.query(
          `
          INSERT INTO ps_embeddings (ps_id, embedding)
          VALUES ($1, $2::vector)
          `,
          [finalPsId, vectorStr]
        );
      }

      // 3. Insert ps_issue_links for all contributing evidence issues
      for (const eId of evidenceIds) {
        await client.query(
          `
          INSERT INTO ps_issue_links (ps_id, issue_id, similarity_score)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
          `,
          [finalPsId, eId, ps.confidence]
        );
      }

      // 4. Update MongoDB contributing issues status to 'clustered'
      await Issue.updateMany(
        { id: { $in: evidenceIds } },
        { $set: { agent_status: "clustered" } }
      );

      // 5. Emit Postgres NOTIFY for new Problem Statement
      const notifyPayload = JSON.stringify({
        run_id: runId,
        ps_id: finalPsId,
        type: "created",
        title: ps.title,
        category: ps.category,
        track: ps.track,
        urgent_escalation: isUrgent,
        evidence_count: ps.evidenceCount,
        timestamp: new Date().toISOString(),
      });
      await client.query(`SELECT pg_notify('ps_events', $1)`, [notifyPayload]);

      actionTaken = `Created PS "${ps.title}" (ID: ${finalPsId}) backed by ${evidenceIds.length} evidence issues. Track: ${ps.track}. Urgent: ${isUrgent}`;
    }

    // ── CASE C: WATCHLIST (Unassigned Wait) ───────────────────────────────────
    else {
      await Issue.updateOne(
        { id: issueId },
        { $set: { agent_status: "unassigned" } }
      );
      actionTaken = `Issue ${issueId} confirmed as WATCHLIST/unassigned (insufficient cluster evidence)`;
    }

    // ── FINAL AUDIT RUN LOGGING (FIX M5: Idempotent run logging) ───────────────
    const durationMs = Date.now() - startTime;
    const runLogs = (state.logs || []).join("\n");
    const summaryText = `Final Pipeline Outcome [${state.gate2?.decision || caseDecision}]: ${actionTaken}`;

    const existingRun = await client.query(
      `SELECT id FROM agent_runs WHERE run_id = $1 LIMIT 1`,
      [runId]
    );

    if (existingRun.rows.length > 0) {
      await client.query(
        `
        UPDATE agent_runs
        SET
          ps_id = $2,
          gate2_case = $3,
          gate2_decision = $4,
          reasoning_summary = $5,
          duration_ms = $6,
          run_logs = $7
        WHERE run_id = $1
        `,
        [
          runId,
          finalPsId,
          caseDecision,
          state.gate2?.decision ?? caseDecision,
          summaryText,
          durationMs,
          runLogs,
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO agent_runs (
          run_id,
          issue_id,
          ps_id,
          gate1_result,
          gate1_reasoning,
          gate2_case,
          gate2_decision,
          reasoning_summary,
          model_used,
          duration_ms,
          run_logs
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          runId,
          issueId,
          finalPsId,
          state.gate1?.isResearchable ?? true,
          state.gate1?.reasoning ?? null,
          caseDecision,
          state.gate2?.decision ?? caseDecision,
          summaryText,
          agentConfig.nvidia.model,
          durationMs,
          runLogs,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      status: "persisted",
      logs: [`[${runId}][PersistNode] ${actionTaken}`],
    };
  } catch (err: any) {
    await client.query("ROLLBACK");
    const errorMsg = err?.message || String(err);
    console.error(`❌ [PersistNode] Transaction rolled back for ${issueId}:`, errorMsg);

    return {
      status: "failed",
      error: `[PersistNode] ${errorMsg}`,
      logs: [`[${runId}][PersistNode] Failed to persist outcome: ${errorMsg}`],
    };
  } finally {
    client.release();
  }
}
