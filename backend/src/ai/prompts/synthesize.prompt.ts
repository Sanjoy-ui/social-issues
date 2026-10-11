/**
 * synthesize.prompt.ts — Problem Statement Synthesis Prompt
 *
 * PROMPT_VERSION: 2
 *
 * FIX H4: Removed "Desired Solution & Impact" paragraph instruction.
 * A Problem Statement describes the GAP (what is unknown / why it persists),
 * NOT a solution. The spec explicitly prohibits solution-style outputs.
 *
 * A solution is NEVER a problem statement.
 */

export const PROMPT_VERSION = 2;

export const SYNTHESIS_SYSTEM_PROMPT = `You are the Lead Problem Synthesis Architect for CivicResolve. Your task is to synthesize a cluster of verified citizen reports into a rigorous, research-grade Problem Statement document.

CRITICAL RULE: A Problem Statement describes the GAP — what is unknown, unmeasured, or unresolved — NOT a solution. Do NOT propose tools, sensors, software, systems, or interventions. If you output a solution, you have failed.

### REQUIRED STRUCTURE:

1. TITLE: Authoritative, formal, concise (6-14 words). Describes the PROBLEM, not a solution. BAD: "IoT Sensor for Pothole Detection". GOOD: "Persistent Road Surface Degradation in High-Traffic Urban Corridors Despite Repeated Maintenance".

2. BACKGROUND: 1 paragraph — the recurring community failure: who is affected, how long, at what scale. Cite only the evidence IDs provided to you (mongo IDs in [brackets]).

3. GAP: 1 paragraph — what is NOT known or NOT measured that allows this problem to persist. This is the core research gap. No solutions.

4. RESEARCH_QUESTIONS: 2-4 falsifiable, measurable research questions (not "how to build X" — questions about causes, patterns, and failures).

5. FALSIFIABLE_HYPOTHESES: 2-3 hypotheses that could be disproved by data.

6. VARIABLES_AND_MEASUREMENT: List key dependent and independent variables and how they would be measured.

7. DATA_SOURCES: Existing datasets, sensors, registries, or field methods that could provide evidence.

8. SCOPE: Narrow, bounded scope statement (geographic region, time period, population).

9. ETHICS_NOTES: Privacy, equity, and informed consent considerations relevant to studying this issue.

10. LIMITATIONS: 2-3 known limitations or confounds of the proposed research approach.

### RESPONSE FORMAT:
Respond with ONLY valid JSON matching this schema (no markdown, no backticks, no commentary):
{
  "title": "...",
  "background": "...",
  "gap": "...",
  "research_questions": ["...", "..."],
  "falsifiable_hypotheses": ["...", "..."],
  "variables_and_measurement": "...",
  "data_sources": ["...", "..."],
  "scope": "...",
  "ethics_notes": "...",
  "limitations": ["...", "..."],
  "category": "infrastructure/GIS | agri-tech | health-tech | environment/sustainability | accessibility | digital-safety | disaster-response",
  "affected_area": "...",
  "confidence": 0.85,
  "solution_domain": "tech | policy | infra",
  "target_institution_type": "college | industry | both"
}

Do not fabricate evidence IDs. Only cite mongo IDs that appear in the evidence reports provided to you.`;

export interface EvidenceIssueSnippet {
  id: string;
  title: string;
  description: string;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

export function buildSynthesisUserPrompt(params: {
  evidenceIssues: EvidenceIssueSnippet[];
  solutionDomain?: string;
  targetInstitutionType?: string;
  isEmergencyCase?: boolean;
  patternMetrics?: {
    recurrenceCount: number;
    timeSpanYears: number;
    geographicSpreadKm: number;
    escalationTrend: string;
    repeatedUnresolved: number;
  };
}): string {
  // FIX H2: Evidence snippets are already PII-stripped by ingestNode before being
  // stored in Mongo/state, but we enforce a length cap here as a second layer.
  const issuesList = params.evidenceIssues
    .map(
      (iss, idx) =>
        `[Evidence Report #${idx + 1} - MongoID: ${iss.id}]\nTitle: ${iss.title.slice(0, 200)}\nDescription: ${iss.description.slice(0, 800)}\nLocation: ${iss.address || "Not specified"} (Coords: ${iss.latitude || "N/A"}, ${iss.longitude || "N/A"})\n`
    )
    .join("\n");

  const metricsStr = params.patternMetrics
    ? `\nPattern Metrics:\n- Reports: ${params.patternMetrics.recurrenceCount}\n- Time span: ${params.patternMetrics.timeSpanYears} years\n- Geographic spread: ${params.patternMetrics.geographicSpreadKm} km\n- Escalation trend: ${params.patternMetrics.escalationTrend}\n- Unresolved cases: ${params.patternMetrics.repeatedUnresolved}`
    : "";

  return `Synthesize a Problem Statement GAP DOCUMENT from the following ${params.evidenceIssues.length} verified citizen report(s). Remember: describe the GAP, not a solution.

${issuesList}
Context:
- Solution Domain: ${params.solutionDomain || "tech"}
- Target Institution: ${params.targetInstitutionType || "both"}${metricsStr}${
  params.isEmergencyCase
    ? "\n- URGENT: This was flagged as a critical safety hazard requiring immediate research attention."
    : ""
}

Generate the JSON problem statement specification. Cite only MongoIDs from the evidence above. Do not propose solutions.`;
}
