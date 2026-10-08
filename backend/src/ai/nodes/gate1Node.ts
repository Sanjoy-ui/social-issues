import { db } from "../../config/db.js";
import { agentRuns } from "../../models/agentRun.js";
import { Issue } from "../../models/issue.js";
import { generateCompletion } from "../client/llm.client.js";
import { agentConfig } from "../config/agent.config.js";
import {
  GATE_1_SYSTEM_PROMPT,
  buildGate1UserPrompt,
} from "../prompts/gate1.prompt.js";
import type { AgentState, Gate1Decision } from "../graph/state.js";

interface ParsedGate1Output {
  is_researchable: boolean;
  reasoning: string;
  solution_domain: "tech" | "policy" | "infra" | "not_applicable";
  target_institution_type: "college" | "industry" | "both" | "none";
  suggested_category?: string;
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

    // 2. Invoke LLM classifier with structured JSON prompt and image proofs
    const userPrompt = buildGate1UserPrompt({
      title: issueTitle!,
      description: issueDescription!,
      address: issueAddress,
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
        combined.includes("theft");

      parsed = {
        is_researchable: !isGrievance,
        reasoning: isGrievance
          ? "Identified as interpersonal grievance or non-researchable complaint."
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

    // 5. Insert audit log row into Postgres agent_runs (Task 18)
    try {
      await db.insert(agentRuns).values({
        issueId,
        psId: null,
        gate1Result: isResearchable,
        gate1Reasoning: reasoning,
        gate2Case: !isResearchable ? "gated_out" : null,
        reasoningSummary: `Gate 1: ${isResearchable ? "PASS" : "FAIL"} (${solutionDomain}/${targetInstitutionType}) — ${reasoning}`,
        modelUsed: agentConfig.nvidia.model,
        durationMs,
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
    };

    // 6. Return state update with early exit condition (Task 19)
    if (!isResearchable) {
      return {
        gate1: gate1Decision,
        status: "gated_not_researchable",
        logs: [
          `[Gate1Node] Issue ${issueId} GATED OUT as non-researchable: "${reasoning}" (domain: ${solutionDomain})`,
        ],
      };
    }

    return {
      gate1: gate1Decision,
      logs: [
        `[Gate1Node] Issue ${issueId} PASSED Gate 1: "${reasoning}" (domain: ${solutionDomain}, target: ${targetInstitutionType})`,
      ],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [Gate1Node] Execution failed for issue ${issueId}:`, errorMsg);

    return {
      status: "failed",
      error: `[Gate1Node] ${errorMsg}`,
      logs: [`[Gate1Node] Error evaluating solvability: ${errorMsg}`],
    };
  }
}
