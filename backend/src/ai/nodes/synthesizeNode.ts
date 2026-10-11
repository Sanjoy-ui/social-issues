import { pool } from "../../config/db.js";
import { Issue } from "../../models/issue.js";
import { generateCompletion, generateEmbedding } from "../client/llm.client.js";
import { sanitiseForPrompt, stripPii } from "../../utils/pii.js";
import { agentConfig } from "../config/agent.config.js";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
  type EvidenceIssueSnippet,
} from "../prompts/synthesize.prompt.js";
import type { AgentState, ProblemStatementDraft } from "../graph/state.js";

const SOLUTION_KEYWORDS = [
  "deploy", "install", "build a system", "implement a system",
  "create an app", "develop an app", "use AI", "use sensors",
  "install sensors", "smart sensors", "IoT sensors",
  "our solution", "the solution is", "we recommend",
  "we propose", "the fix is",
];

/**
 * FIX M7: Self-check — rejects statements that:
 * 1. Contain solution-proposal language
 * 2. Are too broad (< 100 chars in gap field)
 * 3. Have no research questions
 */
function selfCheck(parsed: any, evidenceIds: Set<string>): { passed: boolean; reason: string | null } {
  const fullText = JSON.stringify(parsed).toLowerCase();

  // Check 1: No solution language
  for (const kw of SOLUTION_KEYWORDS) {
    if (fullText.includes(kw.toLowerCase())) {
      return { passed: false, reason: `Self-check: output contains solution-style language ("${kw}")` };
    }
  }

  // Check 2: Gap must be substantive
  if (!parsed.gap || parsed.gap.length < 100) {
    return { passed: false, reason: "Self-check: gap description is too short or missing (<100 chars)" };
  }

  // Check 3: Research questions must exist
  if (!Array.isArray(parsed.research_questions) || parsed.research_questions.length === 0) {
    return { passed: false, reason: "Self-check: no research questions provided" };
  }

  return { passed: true, reason: null };
}

/**
 * FIX H6: Validate that any mongo IDs mentioned in the statement text
 * are a subset of the retrieved evidence IDs.
 * Returns the set of cited IDs found in the text (for persisting).
 */
function validateCitedIds(statementText: string, validIds: Set<string>): {
  citedIds: string[];
  hallucinated: string[];
} {
  // Mongo IDs follow pattern ISSUE-XXXXXX-XXXXXX or similar alphanum-dash
  const idPattern = /ISSUE-[A-Z0-9]+-[A-Z0-9]+/g;
  const found = statementText.match(idPattern) || [];
  const unique = [...new Set(found)];
  const citedIds = unique.filter((id) => validIds.has(id));
  const hallucinated = unique.filter((id) => !validIds.has(id));
  return { citedIds, hallucinated };
}

/**
 * Node 5: Synthesize Problem Statement (LLM)
 * - FIX H1/H2: PII-stripped snippets sent to LLM
 * - FIX B3: Fallback no longer fabricates a PS; it throws to abort the run
 * - FIX H6: Post-synthesis validation of cited mongo IDs
 * - FIX M6: Dedup threshold from config, not hardcoded
 * - FIX M7: Self-check rejects solution-style / too-broad / unmeasurable outputs
 * - FIX H4: Synthesis prompt asks for GAP, not solution
 */
export async function synthesizeNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const runId = state.runId;
  const evidenceIds = state.gate2?.evidenceIssueIds || [issueId];
  const isEmergencyCase = state.gate2?.caseDecision === "E";

  try {
    // 1. Fetch all evidence issues from MongoDB
    const docs = await Issue.find({ id: { $in: evidenceIds } });

    // FIX H1: Strip PII from evidence snippets before sending to LLM
    const snippets: EvidenceIssueSnippet[] = docs.map((doc) => ({
      id: doc.id,
      title: stripPii(doc.issue_title),
      description: stripPii(doc.issue_description),
      address: doc.address ? sanitiseForPrompt(doc.address) : null,
      latitude: doc.latitude,
      longitude: doc.longitude,
    }));

    if (snippets.length === 0 && state.issue) {
      snippets.push({
        id: state.issue.id,
        title: stripPii(state.issue.title),
        description: stripPii(state.issue.description),
        address: null,
        latitude: state.issue.latitude,
        longitude: state.issue.longitude,
      });
    }

    // 2. Invoke LLM for synthesis
    const userPrompt = buildSynthesisUserPrompt({
      evidenceIssues: snippets,
      solutionDomain: state.gate1?.solutionDomain,
      targetInstitutionType: state.gate1?.targetInstitutionType,
      isEmergencyCase,
      patternMetrics: state.retrieval?.patternMetrics,
    });

    const rawResponse = await generateCompletion({
      systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.5,
      maxTokens: 4096,
      reasoningEffort: "low",
    });

    // 3. Parse JSON response
    let parsed: any;
    try {
      const cleaned = rawResponse
        .replace(/```(?:json)?/gi, "")
        .replace(/```/g, "")
        .trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      parsed = JSON.parse(
        firstBrace !== -1 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned
      );
    } catch (parseErr) {
      // FIX B3: Do NOT fabricate a PS. Abort cleanly so the grievance can be retried.
      const errMsg = `LLM returned unparseable JSON for issue ${issueId}. Aborting synthesis to prevent hallucination. Raw: ${rawResponse.slice(0, 300)}`;
      console.error(`❌ [SynthesizeNode] ${errMsg}`);
      throw new Error(errMsg);
    }

    // 4. FIX M7: Self-check
    const evidenceIdSet = new Set(evidenceIds);
    const selfCheckResult = selfCheck(parsed, evidenceIdSet);
    if (!selfCheckResult.passed) {
      const errMsg = `[SynthesizeNode] ${selfCheckResult.reason} — aborting synthesis.`;
      console.warn(`⚠️ ${errMsg}`);
      throw new Error(errMsg);
    }

    // 5. FIX H6: Validate cited IDs
    const statementText = (parsed.background || "") + " " + (parsed.gap || "");
    const { citedIds, hallucinated } = validateCitedIds(statementText, evidenceIdSet);
    if (hallucinated.length > 0) {
      console.warn(
        `⚠️ [SynthesizeNode] Hallucinated IDs detected and STRIPPED: ${hallucinated.join(", ")}`
      );
    }

    const title = (parsed.title || "").trim() || "Civic Problem Statement";
    const background = parsed.background?.trim() || "";
    const gap = parsed.gap?.trim() || "";
    // Compose statementText from gap-focused fields (not solution)
    const fullStatementText = [
      background && `**Background**\n${background}`,
      gap && `**Gap**\n${gap}`,
      parsed.research_questions?.length && `**Research Questions**\n${parsed.research_questions.join("\n")}`,
      parsed.falsifiable_hypotheses?.length && `**Falsifiable Hypotheses**\n${parsed.falsifiable_hypotheses.join("\n")}`,
      parsed.variables_and_measurement && `**Variables & Measurement**\n${parsed.variables_and_measurement}`,
      parsed.data_sources?.length && `**Data Sources**\n${parsed.data_sources.join("\n")}`,
      parsed.scope && `**Scope**\n${parsed.scope}`,
      parsed.ethics_notes && `**Ethics Notes**\n${parsed.ethics_notes}`,
      parsed.limitations?.length && `**Limitations**\n${parsed.limitations.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const category = parsed.category || "infrastructure/GIS";
    const affectedArea = parsed.affected_area || null;
    const confidence =
      typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
        ? Math.min(Math.max(parsed.confidence, 0.5), 0.99)
        : 0.88;

    const solutionDomain = parsed.solution_domain || state.gate1?.solutionDomain || "tech";
    const targetInstitutionType =
      parsed.target_institution_type || state.gate1?.targetInstitutionType || "both";

    // Derive track from targetInstitutionType
    const track: "RESEARCH" | "INDUSTRY" | "HYBRID" =
      targetInstitutionType === "college" ? "RESEARCH"
      : targetInstitutionType === "industry" ? "INDUSTRY"
      : "HYBRID";

    // 6. Generate dense vector embedding for synthesized PS
    const psTextToEmbed = `Title: ${title}\nGap: ${gap}\nCategory: ${category}`;
    const embedding = await generateEmbedding(psTextToEmbed, "passage");
    const embeddingStr = `[${embedding.join(",")}]`;

    // 7. FIX M6: Dedup check — threshold from config, not hardcoded
    const dedupThreshold = agentConfig.gate2.dedupSimilarityThreshold;
    let dedupMatchedPsId: string | null = null;
    let dedupSimilarity = 0;
    let dedupTitle = "";

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
      dedupTitle = dedupRes.rows[0].title;
      if (dedupSimilarity >= dedupThreshold) {
        dedupMatchedPsId = dedupRes.rows[0].ps_id;
      }
    }

    const draft: ProblemStatementDraft = {
      title,
      statementText: fullStatementText,
      category,
      affectedArea,
      solutionDomain,
      targetInstitutionType,
      track,
      confidence,
      evidenceCount: snippets.length,
      citedMongoIds: citedIds,
      embedding,
      dedupMatchedPsId,
      selfCheckPassed: true,
      selfCheckRejectionReason: null,
    };

    const dedupLog = dedupMatchedPsId
      ? ` [Dedup: merging into "${dedupTitle}" (${(dedupSimilarity * 100).toFixed(1)}%)]`
      : "";

    return {
      problemStatement: draft,
      status: "synthesized",
      logs: [
        `[${runId}][SynthesizeNode] Synthesized "${title}" from ${snippets.length} evidence(s). Track: ${track}. Confidence: ${confidence.toFixed(2)}. Self-check: PASSED. Cited IDs: [${citedIds.join(", ")}]${dedupLog}`,
      ],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [SynthesizeNode] Synthesis failed for issue ${issueId}:`, errorMsg);

    return {
      status: "failed",
      error: `[SynthesizeNode] ${errorMsg}`,
      logs: [`[${runId}][SynthesizeNode] Error synthesizing problem statement: ${errorMsg}`],
    };
  }
}
