import { pool } from "../../config/db.js";
import { Issue } from "../../models/issue.js";
import { generateCompletion, generateEmbedding } from "../client/llm.client.js";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
  type EvidenceIssueSnippet,
} from "../prompts/synthesize.prompt.js";
import type { AgentState, ProblemStatementDraft } from "../graph/state.js";

interface ParsedSynthesisOutput {
  title: string;
  statement_text: string;
  category: string;
  affected_area?: string;
  confidence?: number;
  root_cause_hypotheses?: string[];
  solution_domain?: string;
  target_institution_type?: string;
}

/**
 * Node 5: Synthesize Problem Statement (LLM with kimi-k3)
 * - Fetches all evidence issues from MongoDB
 * - Invokes kimi-k3 to synthesize an actionable problem statement
 * - Computes vector embedding (1024-dim) for the draft statement
 * - Performs dedup check against existing problem statements in pgvector
 * - Emits ProblemStatementDraft into agent state
 */
export async function synthesizeNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const evidenceIds = state.gate2?.evidenceIssueIds || [issueId];
  const isEmergencyCase = state.gate2?.caseDecision === "E";

  try {
    // 1. Fetch all evidence issues from MongoDB (Task 36)
    const docs = await Issue.find({ id: { $in: evidenceIds } });

    const snippets: EvidenceIssueSnippet[] = docs.map((doc) => ({
      id: doc.id,
      title: doc.issue_title,
      description: doc.issue_description,
      address: doc.address,
      latitude: doc.latitude,
      longitude: doc.longitude,
    }));

    // If for any reason no docs found, fallback to current issue in state
    if (snippets.length === 0 && state.issue) {
      snippets.push({
        id: state.issue.id,
        title: state.issue.title,
        description: state.issue.description,
        address: null,
        latitude: state.issue.latitude,
        longitude: state.issue.longitude,
      });
    }

    // 2. Invoke kimi-k3 for synthesis (Task 37)
    const userPrompt = buildSynthesisUserPrompt({
      evidenceIssues: snippets,
      solutionDomain: state.gate1?.solutionDomain,
      targetInstitutionType: state.gate1?.targetInstitutionType,
      isEmergencyCase,
    });

    const rawResponse = await generateCompletion({
      systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.6,
      maxTokens: 4096,
      reasoningEffort: "low",
    });

    // 3. Clean and parse JSON response
    let parsed: ParsedSynthesisOutput;
    try {
      const cleaned = rawResponse
        .replace(/```(?:json)?/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn(
        `⚠️ [SynthesizeNode] JSON parse failed, applying structured fallback:`,
        rawResponse.slice(0, 200)
      );
      parsed = {
        title: `Community Resolution Initiative: ${snippets[0]?.title || "Civic Challenge"}`,
        statement_text: `${snippets[0]?.description || ""}\n\nEvidence gathered from ${snippets.length} citizen report(s) requires collaborative technology and infrastructure intervention.`,
        category: state.gate1?.solutionDomain || "infrastructure/GIS",
        affected_area: snippets[0]?.address || "Urban Municipality",
        confidence: 0.85,
        solution_domain: state.gate1?.solutionDomain || "tech",
        target_institution_type: state.gate1?.targetInstitutionType || "both",
      };
    }

    const title = parsed.title?.trim() || "Civic Problem Statement";
    const statementText = parsed.statement_text?.trim() || "";
    const category = parsed.category || "infrastructure/GIS";
    const affectedArea = parsed.affected_area || null;
    const confidence =
      typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
        ? Math.min(Math.max(parsed.confidence, 0.5), 0.99)
        : 0.88;

    const solutionDomain = parsed.solution_domain || state.gate1?.solutionDomain || "tech";
    const targetInstitutionType =
      parsed.target_institution_type || state.gate1?.targetInstitutionType || "both";

    // 4. Generate dense vector embedding for synthesized PS (Task 38)
    const psTextToEmbed = `Title: ${title}\nStatement: ${statementText}\nCategory: ${category}`;
    const embedding = await generateEmbedding(psTextToEmbed, "passage");
    const embeddingStr = `[${embedding.join(",")}]`;

    // 5. Dedup Check against existing ps_embeddings in Postgres (Task 39)
    let dedupMatchedPsId: string | null = null;
    let dedupSimilarity = 0;

    const dedupRes = await pool.query(
      `
      SELECT
        ps.id AS ps_id,
        ps.title,
        1 - (pse.embedding <=> $1::vector) AS similarity
      FROM ps_embeddings pse
      JOIN problem_statements ps ON ps.id = pse.ps_id
      WHERE ps.status != 'rejected'
      ORDER BY pse.embedding <=> $1::vector ASC
      LIMIT 1
      `,
      [embeddingStr]
    );

    if (dedupRes.rows.length > 0) {
      dedupSimilarity = parseFloat(dedupRes.rows[0].similarity);
      if (dedupSimilarity >= 0.88) {
        dedupMatchedPsId = dedupRes.rows[0].ps_id;
      }
    }

    const draft: ProblemStatementDraft = {
      title,
      statementText,
      category,
      affectedArea,
      solutionDomain,
      targetInstitutionType,
      confidence,
      evidenceCount: snippets.length,
      embedding,
      dedupMatchedPsId,
    };

    const dedupLog = dedupMatchedPsId
      ? ` [Dedup Match: Merging into existing PS "${dedupRes.rows[0].title}" (similarity: ${(dedupSimilarity * 100).toFixed(1)}%)]`
      : "";

    return {
      problemStatement: draft,
      status: "synthesized",
      logs: [
        `[SynthesizeNode] Synthesized Problem Statement "${title}" from ${snippets.length} evidence issue(s). Confidence: ${confidence.toFixed(2)}${dedupLog}`,
      ],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [SynthesizeNode] Synthesis failed for issue ${issueId}:`, errorMsg);

    return {
      status: "failed",
      error: `[SynthesizeNode] ${errorMsg}`,
      logs: [`[SynthesizeNode] Error synthesizing problem statement: ${errorMsg}`],
    };
  }
}
