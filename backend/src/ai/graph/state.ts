import { Annotation } from "@langchain/langgraph";

export interface IssueContext {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  proofUrls?: string[];
  translatedText?: string | null;
  languageDetected?: string | null;
}

export interface Gate1Decision {
  isResearchable: boolean;
  reasoning: string;
  solutionDomain: "tech" | "policy" | "infra" | "not_applicable";
  targetInstitutionType: "college" | "industry" | "both" | "none";
}

export interface CandidateMatch {
  issueId: string;
  similarity: number;
  category?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}

export interface PsMatch {
  psId: string;
  title: string;
  status: string;
  similarity: number;
}

export interface RetrievalContext {
  similarIssues: CandidateMatch[];
  matchedProblemStatements: PsMatch[];
}

export interface Gate2Decision {
  caseDecision: "A" | "B" | "C" | "E";
  matchedPsId?: string | null;
  clusterSize: number;
  evidenceIssueIds: string[];
  reasoning: string;
}

export interface ProblemStatementDraft {
  title: string;
  statementText: string;
  category: string;
  affectedArea?: string | null;
  solutionDomain: string;
  targetInstitutionType: string;
  confidence: number;
  evidenceCount: number;
  embedding?: number[];
  dedupMatchedPsId?: string | null;
}

/**
 * State annotation for the CivicResolve 2-Gate LangGraph workflow
 */
export const AgentStateAnnotation = Annotation.Root({
  issueId: Annotation<string>(),
  issue: Annotation<IssueContext | null>({
    default: () => null,
    reducer: (_, update) => update,
  }),
  gate1: Annotation<Gate1Decision | null>({
    default: () => null,
    reducer: (_, update) => update,
  }),
  retrieval: Annotation<RetrievalContext | null>({
    default: () => null,
    reducer: (_, update) => update,
  }),
  gate2: Annotation<Gate2Decision | null>({
    default: () => null,
    reducer: (_, update) => update,
  }),
  problemStatement: Annotation<ProblemStatementDraft | null>({
    default: () => null,
    reducer: (_, update) => update,
  }),
  status: Annotation<
    | "idle"
    | "ingested"
    | "gated_not_researchable"
    | "clustered"
    | "unassigned"
    | "synthesized"
    | "persisted"
    | "failed"
  >({
    default: () => "idle",
    reducer: (_, update) => update,
  }),
  logs: Annotation<string[]>({
    default: () => [],
    reducer: (curr, update) => curr.concat(update),
  }),
  error: Annotation<string | null>({
    default: () => null,
    reducer: (_, update) => update,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
