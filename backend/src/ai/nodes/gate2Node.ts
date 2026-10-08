import { db } from "../../config/db.js";
import { agentRuns } from "../../models/agentRun.js";
import { Issue } from "../../models/issue.js";
import { agentConfig } from "../config/agent.config.js";
import type { AgentState, Gate2Decision } from "../graph/state.js";

/**
 * Node 4: Gate 2 — Pattern & Cluster Evaluation (Deterministic Rules)
 *
 * Rules:
 * - CASE A: Existing live PS similarity >= similarityThreshold (0.82) -> Join existing PS
 * - CASE E: Severity flag == 'critical' (emergency/safety hazard) -> Synthesize immediately (even 1 report)
 * - CASE B: Cluster size >= minClusterSize (distinct reporters, Gate 1 passed) -> Synthesize new PS
 * - CASE C: Insufficient pattern evidence -> Mark 'unassigned', wait in pool for future clusters
 */
export async function gate2Node(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const startTime = Date.now();
  const { minClusterSize, similarityThreshold, criticalSeverityBypass } =
    agentConfig.gate2;

  try {
    const retrieval = state.retrieval;
    const similarIssues = retrieval?.similarIssues || [];
    const matchedPsList = retrieval?.matchedProblemStatements || [];

    // ── 1. RULE CHECK: CASE A (Join Existing PS) ─────────────────────────────
    const topPsMatch = matchedPsList[0];
    if (topPsMatch && topPsMatch.similarity >= similarityThreshold) {
      const reasoning = `Case A: Strong match to existing Problem Statement "${topPsMatch.title}" (similarity: ${topPsMatch.similarity.toFixed(3)} >= ${similarityThreshold}). Joining existing statement.`;

      const gate2Decision: Gate2Decision = {
        caseDecision: "A",
        matchedPsId: topPsMatch.psId,
        clusterSize: 1,
        evidenceIssueIds: [issueId],
        reasoning,
      };

      await logGate2Run(issueId, gate2Decision, startTime);

      return {
        gate2: gate2Decision,
        logs: [`[Gate2Node] ${reasoning}`],
      };
    }

    // ── 2. FETCH CURRENT ISSUE TO INSPECT DETAILS & SEVERITY ─────────────────
    const currentDoc = await Issue.findOne({ id: issueId });
    const isCritical =
      Boolean((currentDoc as any)?.severity_flag === "critical") ||
      Boolean((currentDoc as any)?.severity === "critical") ||
      (currentDoc?.issue_title?.toLowerCase().includes("[critical]") ?? false);

    // ── 3. RULE CHECK: CASE E (Critical Severity Emergency Bypass) ───────────
    if (criticalSeverityBypass && isCritical) {
      const reasoning = `Case E: Critical severity flagged for issue ${issueId}. Bypassing cluster threshold to synthesize urgent problem statement immediately.`;

      const gate2Decision: Gate2Decision = {
        caseDecision: "E",
        matchedPsId: null,
        clusterSize: 1,
        evidenceIssueIds: [issueId],
        reasoning,
      };

      await logGate2Run(issueId, gate2Decision, startTime);

      return {
        gate2: gate2Decision,
        logs: [`[Gate2Node] ${reasoning}`],
      };
    }

    // ── 4. DEDUPLICATE REPORTERS ACROSS SIMILAR ISSUES CLUSTER (Task 27) ──────
    // Filter candidates with similarity >= clusterSimilarityThreshold (default 0.65)
    const clusterCutoff = agentConfig.gate2.clusterSimilarityThreshold ?? 0.65;
    const clusterCandidates = similarIssues.filter((c) => c.similarity >= clusterCutoff);
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

    // Group by distinct reporter identity (deduplicate multiple reports from the same citizen)
    const distinctReporters = new Set<string>();
    const validEvidenceIds: string[] = [];

    for (const doc of validDocs) {
      const reporterKey =
        doc.citizen_id ||
        doc.email ||
        doc.username ||
        `anon_${doc.id}`; // If totally anonymous, treat as unique report

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
        caseDecision: "B",
        matchedPsId: null,
        clusterSize,
        evidenceIssueIds: validEvidenceIds,
        reasoning,
      };

      await logGate2Run(issueId, gate2Decision, startTime);

      return {
        gate2: gate2Decision,
        logs: [`[Gate2Node] ${reasoning} Contributing issues: ${validEvidenceIds.join(", ")}`],
      };
    }

    // ── 6. RULE CHECK: CASE C (Unassigned, Pool Wait) ────────────────────────
    const reasoning = `Case C: Pattern threshold not yet met (${clusterSize}/${minClusterSize} distinct reports). Marking as unassigned to accumulate in knowledge pool.`;

    const gate2Decision: Gate2Decision = {
      caseDecision: "C",
      matchedPsId: null,
      clusterSize,
      evidenceIssueIds: [issueId],
      reasoning,
    };

    // Update MongoDB status to 'unassigned'
    await Issue.updateOne(
      { id: issueId },
      { $set: { agent_status: "unassigned" } }
    );

    await logGate2Run(issueId, gate2Decision, startTime);

    return {
      gate2: gate2Decision,
      status: "unassigned",
      logs: [`[Gate2Node] ${reasoning}`],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [Gate2Node] Error evaluating cluster rules for ${issueId}:`, errorMsg);

    const fallbackDecision: Gate2Decision = {
      caseDecision: "C",
      matchedPsId: null,
      clusterSize: 1,
      evidenceIssueIds: [issueId],
      reasoning: `Fallback Case C due to error: ${errorMsg}`,
    };

    return {
      gate2: fallbackDecision,
      status: "unassigned",
      logs: [`[Gate2Node] Error: ${errorMsg}`],
    };
  }
}

/**
 * Helper to record Gate 2 audit run in Postgres
 */
async function logGate2Run(
  issueId: string,
  decision: Gate2Decision,
  startTime: number
): Promise<void> {
  try {
    const durationMs = Date.now() - startTime;
    await db.insert(agentRuns).values({
      issueId,
      psId: decision.matchedPsId ? (decision.matchedPsId as any) : null,
      gate1Result: true,
      gate1Reasoning: null,
      gate2Case: decision.caseDecision,
      reasoningSummary: decision.reasoning,
      modelUsed: "deterministic-gate2",
      durationMs,
    });
  } catch (err: any) {
    console.error(`⚠️ [Gate2Node] Failed to record agent_run audit log:`, err?.message);
  }
}
