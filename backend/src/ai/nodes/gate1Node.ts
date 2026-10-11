import { db } from "../../config/db.js";
import { agentRuns } from "../../models/agentRun.js";
import { Issue } from "../../models/issue.js";
import { generateCompletion } from "../client/llm.client.js";
import { agentConfig } from "../config/agent.config.js";
import { sanitiseForPrompt } from "../../utils/pii.js";
import {
  GATE_1_SYSTEM_PROMPT,
  buildGate1UserPrompt,
  PROMPT_VERSION,
} from "../prompts/gate1.prompt.js";
import type { AgentState, Gate1Decision, ResearchScores, IndustryScores } from "../graph/state.js";

interface ParsedGate1Output {
  is_researchable: boolean;
  reasoning: string;
  solution_domain: "tech" | "policy" | "infra" | "not_applicable";
  target_institution_type: "college" | "industry" | "both" | "none";
  suggested_category?: string;
  research_scores?: {
    novelty?: number;
    measurability?: number;
    data_availability?: number;
    ethics_feasibility?: number;
    significance?: number;
  };
  industry_scores?: {
    payer?: number;
    cost?: number;
    market?: number;
    feasibility?: number;
    scalability?: number;
  };
  score_justification?: string;
}

/**
 * Node 2: Gate 1 — Solvability & Researchability Classifier
 * - Evaluates issue using kimi-k3 against structured domain taxonomy
 * - Writes decision metadata to MongoDB issue
 * - Logs audit trail row in Postgres agent_runs
 * - Sets status: 'gated_not_researchable' if filtered out, or passes to retrieval
 */
export async function gate1Node(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const runId = state.runId;
  const startTime = Date.now();

  try {
    // 1. Resolve issue context
    let issueTitle = state.issue?.title;
    let issueDescription = state.issue?.description;
    let issueAddress = "";
    let proofUrls: string[] = state.issue?.proofUrls || [];

    if (!issueTitle || !issueDescription || proofUrls.length === 0) {
      const issueDoc = await Issue.findOne({ id: issueId });
      if (issueDoc) {
        issueTitle = issueTitle || issueDoc.issue_title;
        issueDescription = issueDescription || issueDoc.issue_description;
        issueAddress = issueDoc.address || "";
        if (proofUrls.length === 0 && Array.isArray(issueDoc.issue_proof)) {
          proofUrls = issueDoc.issue_proof;
        }
      } else if (!issueTitle || !issueDescription) {
        throw new Error(`Issue not found in MongoDB with id: ${issueId}`);
      }
    }

    // Filter valid image URLs from Cloudinary for multimodal inspection
    const imageUrls = proofUrls.filter(
      (url) =>
        url.includes("res.cloudinary.com") ||
        /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(url)
    );

    // 2. FIX H2: Sanitise user-controlled strings before prompt interpolation
    //    to prevent prompt-injection attacks via grievance text.
    const userPrompt = buildGate1UserPrompt({
      title: sanitiseForPrompt(issueTitle),
      description: sanitiseForPrompt(issueDescription),
      address: sanitiseForPrompt(issueAddress),
    });

    const rawResponse = await generateCompletion({
      systemPrompt: GATE_1_SYSTEM_PROMPT,
      prompt: userPrompt,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      temperature: 0.6,
      maxTokens: 2048,
      reasoningEffort: "low",
    });

    // 3. Clean and parse JSON response
    let parsed: ParsedGate1Output;
    try {
      const firstBrace = rawResponse.indexOf("{");
      const lastBrace = rawResponse.lastIndexOf("}");
      let jsonString = rawResponse;
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = rawResponse.substring(firstBrace, lastBrace + 1);
      } else {
        jsonString = rawResponse.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      }
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.warn(
        `⚠️ [Gate1Node] Failed to parse JSON response for ${issueId}, using intelligent heuristic:`,
        rawResponse.slice(0, 200)
      );
      // Smart Fallback: check issue content for non-researchable indicators
      const combined = `${issueTitle} ${issueDescription}`.toLowerCase();
      const isGrievance =
        combined.includes("neighbor") ||
        combined.includes("loud music") ||
        combined.includes("shouting") ||
        combined.includes("dispute") ||
        combined.includes("bribe") ||
        combined.includes("stolen") ||
        combined.includes("theft") ||
        combined.includes("pothole") ||
        combined.includes("broken road") ||
        combined.includes("street light") ||
        combined.includes("streetlight") ||
        combined.includes("garbage") ||
        combined.includes("trash");

      parsed = {
        is_researchable: !isGrievance,
        reasoning: isGrievance
          ? "Identified as routine maintenance grievance or non-researchable complaint."
          : "Identified as civic engineering/technology research problem.",
        solution_domain: isGrievance ? "not_applicable" : "tech",
        target_institution_type: isGrievance ? "none" : "college",
      };
    }

    const isResearchable = Boolean(parsed.is_researchable);
    const reasoning = parsed.reasoning || "Evaluated by Gate 1 classifier";
    const solutionDomain = (
      ["tech", "policy", "infra", "not_applicable"].includes(parsed.solution_domain)
        ? parsed.solution_domain
        : isResearchable ? "tech" : "not_applicable"
    ) as Gate1Decision["solutionDomain"];

    const targetInstitutionType = (
      ["college", "industry", "both", "none"].includes(parsed.target_institution_type)
        ? parsed.target_institution_type
        : isResearchable ? "both" : "none"
    ) as Gate1Decision["targetInstitutionType"];

    // FIX M1: Extract structured 5+5 research & industry scores
    const researchScores: ResearchScores | null = parsed.research_scores
      ? {
          novelty: Math.min(5, Math.max(1, Number(parsed.research_scores.novelty) || 3)),
          measurability: Math.min(5, Math.max(1, Number(parsed.research_scores.measurability) || 3)),
          dataAvailability: Math.min(5, Math.max(1, Number(parsed.research_scores.data_availability) || 3)),
          ethicsFeasibility: Math.min(5, Math.max(1, Number(parsed.research_scores.ethics_feasibility) || 4)),
          significance: Math.min(5, Math.max(1, Number(parsed.research_scores.significance) || 3)),
        }
      : isResearchable
      ? { novelty: 3, measurability: 3, dataAvailability: 3, ethicsFeasibility: 4, significance: 3 }
      : null;

    const industryScores: IndustryScores | null = parsed.industry_scores
      ? {
          payer: Math.min(5, Math.max(1, Number(parsed.industry_scores.payer) || 3)),
          cost: Math.min(5, Math.max(1, Number(parsed.industry_scores.cost) || 3)),
          market: Math.min(5, Math.max(1, Number(parsed.industry_scores.market) || 3)),
          feasibility: Math.min(5, Math.max(1, Number(parsed.industry_scores.feasibility) || 3)),
          scalability: Math.min(5, Math.max(1, Number(parsed.industry_scores.scalability) || 3)),
        }
      : isResearchable
      ? { payer: 3, cost: 3, market: 3, feasibility: 3, scalability: 3 }
      : null;

    const scoreJustification = parsed.score_justification || parsed.reasoning || null;

    const durationMs = Date.now() - startTime;

    // 4. Update MongoDB Issue record (Task 17)
    await Issue.updateOne(
      { id: issueId },
      {
        $set: {
          is_researchable: isResearchable,
          researchability_reasoning: reasoning,
          solution_domain: solutionDomain,
          target_institution_type: targetInstitutionType,
          agent_status: isResearchable ? "processing" : "gated_out",
        },
      }
    );

    // 5. Insert audit log row into Postgres agent_runs (Task 18 + FIX H8/M1/M9/M10)
    try {
      await db.insert(agentRuns).values({
        runId,
        issueId,
        psId: null,
        gate1Result: isResearchable,
        gate1Reasoning: reasoning,
        gate2Case: !isResearchable ? "gated_out" : null,
        gate2Decision: !isResearchable ? "VECTOR_ONLY" : null,
        reasoningSummary: `Gate 1: ${isResearchable ? "PASS" : "FAIL"} (${solutionDomain}/${targetInstitutionType}) — ${reasoning}`,
        modelUsed: agentConfig.nvidia.model,
        promptVersion: PROMPT_VERSION,
        researchScores: researchScores ? JSON.stringify(researchScores) : null,
        industryScores: industryScores ? JSON.stringify(industryScores) : null,
        durationMs,
        runLogs: `[${runId}][Gate1Node] Evaluated: ${isResearchable ? "PASS" : "FAIL"} (domain: ${solutionDomain}, target: ${targetInstitutionType})`,
      });
    } catch (dbErr: any) {
      console.error(
        `⚠️ [Gate1Node] Failed to record agent_run in Postgres for ${issueId}:`,
        dbErr?.message
      );
    }

    const gate1Decision: Gate1Decision = {
      isResearchable,
      reasoning,
      solutionDomain,
      targetInstitutionType,
      researchScores,
      industryScores,
      scoreJustification,
    };

    // 6. Return state update with early exit condition
    if (!isResearchable) {
      return {
        gate1: gate1Decision,
        status: "gated_not_researchable",
        logs: [
          `[${runId}][Gate1Node] Issue ${issueId} → VECTOR_ONLY (gated out): "${reasoning}" (domain: ${solutionDomain})`,
        ],
      };
    }

    return {
      gate1: gate1Decision,
      logs: [
        `[${runId}][Gate1Node] Issue ${issueId} PASSED Gate 1: "${reasoning}" (domain: ${solutionDomain}, target: ${targetInstitutionType})`,
      ],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [Gate1Node] Execution failed for issue ${issueId}:`, errorMsg);

    return {
      status: "failed",
      error: `[Gate1Node] ${errorMsg}`,
      logs: [`[${runId}][Gate1Node] Error evaluating solvability: ${errorMsg}`],
    };
  }
}
