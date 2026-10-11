import { db } from "../../config/db.js";
import { eq } from "drizzle-orm";
import { agentRuns } from "../../models/agentRun.js";
import { Issue } from "../../models/issue.js";
import { pool } from "../../config/db.js";
import { agentConfig } from "../config/agent.config.js";
import type { AgentState, Gate2Decision } from "../graph/state.js";

/**
 * Derive the PS track from Gate 1 targetInstitutionType.
 */
function deriveTrack(
  targetInstitutionType: string | undefined
): "RESEARCH" | "INDUSTRY" | "HYBRID" {
  if (targetInstitutionType === "college") return "RESEARCH";
  if (targetInstitutionType === "industry") return "INDUSTRY";
  return "HYBRID";
}

/**
 * Node 4: Gate 2 — Pattern & Cluster Evaluation (Deterministic Rules)
 *
 * Spec vocabulary output:  VECTOR_ONLY | WATCHLIST | PASS
 * Internal case routing:   A | B | C | E
 *
 * Rules:
 * - CASE A: Existing live PS similarity >= similarityThreshold → Join existing PS (PASS)
 * - CASE E: Severity == 'critical' → Synthesize immediately (PASS + urgentEscalation)
 * - CASE B: Cluster size >= minClusterSize (distinct Gate-1-passed reporters,
 *           including WATCHLIST matches) → Synthesize new PS (PASS)
 * - CASE C: Insufficient pattern evidence → WATCHLIST (unassigned, re-evaluated later)
 *
 * FIX B2: minClusterSize is now read from config (default 3, was 1).
 * FIX H3: urgentEscalation flag set in state for Case E.
 * FIX H5: watchlistMatches from retrieveNode are included in cluster dedup.
 * FIX M2: track (RESEARCH/INDUSTRY/HYBRID) emitted in decision.
 */
export async function gate2Node(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const runId = state.runId;
  const startTime = Date.now();
  const { minClusterSize, similarityThreshold, criticalSeverityBypass } =
    agentConfig.gate2;

  try {
    const retrieval = state.retrieval;
    const similarIssues = retrieval?.similarIssues || [];
    const matchedPsList = retrieval?.matchedProblemStatements || [];
    // FIX H5: include watchlist matches in cluster evaluation
    const watchlistMatches = retrieval?.watchlistMatches || [];

    const track = deriveTrack(state.gate1?.targetInstitutionType);

    // ── 1. RULE CHECK: CASE A (Join Existing PS) ─────────────────────────────
    const topPsMatch = matchedPsList[0];
    if (topPsMatch && topPsMatch.similarity >= similarityThreshold) {
      const reasoning = `Case A: Strong match to existing PS "${topPsMatch.title}" (similarity: ${topPsMatch.similarity.toFixed(3)} >= ${similarityThreshold}). Joining existing statement.`;

      const gate2Decision: Gate2Decision = {
        decision: "PASS",
        caseDecision: "A",
        track,
        matchedPsId: topPsMatch.psId,
        clusterSize: 1,
        evidenceIssueIds: [issueId],
        reasoning,
        urgentEscalation: false,
      };

      await logGate2Run(issueId, runId, gate2Decision, startTime);

      return {
        gate2: gate2Decision,
        logs: [`[${runId}][Gate2Node] PASS (Case A): ${reasoning}`],
      };
    }

    // ── 2. FETCH CURRENT ISSUE TO INSPECT SEVERITY ──────────────────────────
    const currentDoc = await Issue.findOne({ id: issueId });
    const isCritical =
      Boolean((currentDoc as any)?.severity_flag === "critical") ||
      Boolean((currentDoc as any)?.severity === "critical") ||
      (currentDoc?.issue_title?.toLowerCase().includes("[critical]") ?? false);

    // ── 3. RULE CHECK: CASE E (Critical Severity Emergency Bypass) ──────────
    if (criticalSeverityBypass && isCritical) {
      const reasoning = `Case E: Critical severity flagged for issue ${issueId}. Bypassing cluster threshold — urgent problem statement synthesis required.`;

      const gate2Decision: Gate2Decision = {
        decision: "PASS",
        caseDecision: "E",
        track,
        matchedPsId: null,
        clusterSize: 1,
        evidenceIssueIds: [issueId],
        reasoning,
        urgentEscalation: true,   // FIX H3
      };

      await logGate2Run(issueId, runId, gate2Decision, startTime);

      // FIX H3: separate pg_notify on urgent escalation channel
      try {
        const urgentPayload = JSON.stringify({
          run_id: runId,
          issue_id: issueId,
          type: "urgent_escalation",
          severity: "critical",
          timestamp: new Date().toISOString(),
        });
        await pool.query(
          `SELECT pg_notify($1, $2)`,
          [agentConfig.gate2.urgentEscalationChannel, urgentPayload]
        );
      } catch (notifyErr: any) {
        console.warn(`⚠️ [Gate2Node] Urgent escalation NOTIFY failed: ${notifyErr?.message}`);
      }

      return {
        gate2: gate2Decision,
        urgentEscalation: true,
        logs: [`[${runId}][Gate2Node] PASS+URGENT (Case E): ${reasoning}`],
      };
    }

    // ── 4. DEDUPLICATE REPORTERS ACROSS SIMILAR ISSUES CLUSTER ──────────────
    const clusterCutoff = agentConfig.gate2.clusterSimilarityThreshold ?? 0.65;
    const clusterCandidates = [
      ...similarIssues.filter((c) => c.similarity >= clusterCutoff),
      // FIX H5: WATCHLIST matches already filtered by threshold in retrieveNode
      ...watchlistMatches,
    ];
    const candidateIds = Array.from(
      new Set([issueId, ...clusterCandidates.map((c) => c.issueId)])
    );

    // Query MongoDB for all candidate issues to check reporter identities & Gate 1 status
    const issueDocs = await Issue.find(
      { id: { $in: candidateIds } },
      { id: 1, citizen_id: 1, email: 1, username: 1, agent_status: 1, is_researchable: 1 }
    );

    // Only count issues that passed Gate 1 (not gated out or failed)
    const validDocs = issueDocs.filter(
      (doc) => doc.agent_status !== "gated_out" && doc.is_researchable !== false
    );

    // Group by distinct reporter identity (deduplicate multiple reports from same citizen)
    const distinctReporters = new Set<string>();
    const validEvidenceIds: string[] = [];

    for (const doc of validDocs) {
      const reporterKey =
        doc.citizen_id ||
        doc.email ||
        doc.username ||
        `anon_${doc.id}`;

      if (!distinctReporters.has(reporterKey)) {
        distinctReporters.add(reporterKey);
        validEvidenceIds.push(doc.id);
      }
    }

    const clusterSize = distinctReporters.size;

    // ── 5. RULE CHECK: CASE B (Cluster Threshold Met) ────────────────────────
    if (clusterSize >= minClusterSize) {
      const reasoning = `Case B: Cluster threshold satisfied with ${clusterSize} distinct citizen reports (threshold: ${minClusterSize}). Generating new synthesized problem statement.`;

      const gate2Decision: Gate2Decision = {
        decision: "PASS",
        caseDecision: "B",
        track,
        matchedPsId: null,
        clusterSize,
        evidenceIssueIds: validEvidenceIds,
        reasoning,
        urgentEscalation: false,
      };

      await logGate2Run(issueId, runId, gate2Decision, startTime);

      return {
        gate2: gate2Decision,
        logs: [`[${runId}][Gate2Node] PASS (Case B): ${reasoning} Contributing: ${validEvidenceIds.join(", ")}`],
      };
    }

    // ── 6. RULE CHECK: CASE C (WATCHLIST) ────────────────────────────────────
    const reasoning = `Case C: Pattern threshold not yet met (${clusterSize}/${minClusterSize} distinct reports). Marking as WATCHLIST to accumulate in knowledge pool.`;

    const gate2Decision: Gate2Decision = {
      decision: "WATCHLIST",
      caseDecision: "C",
      track: null,
      matchedPsId: null,
      clusterSize,
      evidenceIssueIds: [issueId],
      reasoning,
      urgentEscalation: false,
    };

    // Update MongoDB status to 'unassigned'
    await Issue.updateOne(
      { id: issueId },
      { $set: { agent_status: "unassigned" } }
    );

    await logGate2Run(issueId, runId, gate2Decision, startTime);

    return {
      gate2: gate2Decision,
      status: "unassigned",
      logs: [`[${runId}][Gate2Node] WATCHLIST (Case C): ${reasoning}`],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [Gate2Node] Error evaluating cluster rules for ${issueId}:`, errorMsg);

    const fallbackDecision: Gate2Decision = {
      decision: "WATCHLIST",
      caseDecision: "C",
      track: null,
      matchedPsId: null,
      clusterSize: 1,
      evidenceIssueIds: [issueId],
      reasoning: `Fallback WATCHLIST due to error: ${errorMsg}`,
      urgentEscalation: false,
    };

    return {
      gate2: fallbackDecision,
      status: "unassigned",
      logs: [`[${runId}][Gate2Node] Error: ${errorMsg}`],
    };
  }
}

/**
 * Helper to record Gate 2 audit run in Postgres
 */
async function logGate2Run(
  issueId: string,
  runId: string,
  decision: Gate2Decision,
  startTime: number
): Promise<void> {
  try {
    const durationMs = Date.now() - startTime;
    const result = await db
      .update(agentRuns)
      .set({
        psId: decision.matchedPsId ? (decision.matchedPsId as any) : null,
        gate2Case: decision.caseDecision,
        gate2Decision: decision.decision,
        reasoningSummary: decision.reasoning,
        durationMs,
      })
      .where(eq(agentRuns.runId, runId));

    if ((result as any)?.rowCount === 0) {
      await db.insert(agentRuns).values({
        runId,
        issueId,
        psId: decision.matchedPsId ? (decision.matchedPsId as any) : null,
        gate1Result: true,
        gate1Reasoning: null,
        gate2Case: decision.caseDecision,
        gate2Decision: decision.decision,
        reasoningSummary: decision.reasoning,
        modelUsed: "deterministic-gate2",
        durationMs,
      });
    }
  } catch (err: any) {
    console.error(`⚠️ [Gate2Node] Failed to record agent_run audit log:`, err?.message);
  }
}

