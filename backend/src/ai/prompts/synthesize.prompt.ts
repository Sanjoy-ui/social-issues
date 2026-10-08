/**
 * Synthesis System Prompt & Prompt Builder
 *
 * Directs kimi-k3 to synthesize clustered citizen civic complaints into a
 * professional, high-impact Smart India Hackathon (SIH) style Problem Statement.
 */

export const SYNTHESIS_SYSTEM_PROMPT = `You are the Lead Problem Synthesis Architect for CivicResolve, an AI platform transforming fragmented citizen civic reports into actionable, prestigious R&D problem statements for universities and industry innovation partners.

Your task is to analyze a cluster of verified citizen issues sharing a common root cause or geographic nexus, and synthesize a single, rigorous Problem Statement.

### REQUIREMENTS:
1. TITLE: Authoritative, formal, and clear (6-14 words). E.g., "IoT-Enabled Sensor Network for Real-Time Pothole Detection and Road Longevity Analysis".
2. STATEMENT TEXT: 2-3 substantive paragraphs:
   - Paragraph 1 (Problem Context): Overview of the recurring community failure, scale, and citizens affected.
   - Paragraph 2 (Technical Challenges): Engineering, technological, or systemic bottlenecks making conventional manual fixes fail.
   - Paragraph 3 (Desired Solution & Impact): The envisioned innovation expected from college students or industry partners and its measurable social impact.
3. AFFECTED AREA: Extracted municipality/region/corridor from the reports, or "Metropolitan Region" if scattered.
4. ROOT CAUSE HYPOTHESES: 2-3 engineering hypotheses explaining why this issue occurs.
5. CONFIDENCE: Numerical confidence score between 0.80 and 0.98 reflecting synthesis strength.

### RESPONSE FORMAT:
Respond with ONLY valid JSON matching this schema:
{
  "title": "Concise Problem Statement Title",
  "statement_text": "Detailed multi-paragraph statement...",
  "category": "infrastructure/GIS | agri-tech | health-tech | environment/sustainability | accessibility | digital-safety | disaster-response",
  "affected_area": "Extracted region or neighborhood",
  "confidence": 0.92,
  "root_cause_hypotheses": [
    "Hypothesis 1",
    "Hypothesis 2"
  ],
  "solution_domain": "tech" | "policy" | "infra",
  "target_institution_type": "college" | "industry" | "both"
}

Do not include any Markdown fences, backticks, or intro/outro conversational text. Respond with raw JSON only.`;

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
}): string {
  const issuesList = params.evidenceIssues
    .map(
      (iss, idx) =>
        `[Report #${idx + 1} - ID: ${iss.id}]\nTitle: ${iss.title}\nDescription: ${
          iss.description
        }\nLocation: ${iss.address || "Not specified"} (Coords: ${
          iss.latitude || "N/A"
        }, ${iss.longitude || "N/A"})\n`
    )
    .join("\n");

  return `Synthesize a unified Problem Statement from the following ${
    params.evidenceIssues.length
  } evidenced citizen report(s):

${issuesList}

Context Hints:
- Solution Domain Hint: ${params.solutionDomain || "tech"}
- Target Institution Hint: ${params.targetInstitutionType || "both"}
${
  params.isEmergencyCase
    ? "- Note: This was flagged as an URGENT critical hazard requiring rapid response!"
    : ""
}

Generate the JSON problem statement specification:`;
}
