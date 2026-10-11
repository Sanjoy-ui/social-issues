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

export interface ResearchScores {
  novelty: number;
  measurability: number;
  dataAvailability: number;
  ethicsFeasibility: number;
  significance: number;
}

export interface IndustryScores {
  payer: number;
  cost: number;
  market: number;
  feasibility: number;
  scalability: number;
}

export interface Gate1Decision {
  isResearchable: boolean;
  reasoning: string;
  solutionDomain: "tech" | "policy" | "infra" | "not_applicable";
  targetInstitutionType: "college" | "industry" | "both" | "none";
  researchScores?: ResearchScores | null;
  industryScores?: IndustryScores | null;
  scoreJustification?: string | null;
}

export interface CandidateMatch {
  issueId: string;
  similarity: number;
  category?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  createdAt?: Date | null;
  status?: string | null;
}

export interface PsMatch {
  psId: string;
  title: string;
  status: string;
  similarity: number;
}

/** FIX M3: computed pattern-strength metrics */
export interface PatternMetrics {
  recurrenceCount: number;
  timeSpanYears: number;
  geographicSpreadKm: number;
  escalationTrend: "rising" | "stable" | "declining" | "unknown";
  repeatedUnresolved: number;
}

export interface RetrievalContext {
  similarIssues: CandidateMatch[];
  matchedProblemStatements: PsMatch[];
  /** Issues that are currently WATCHLIST (unassigned) with high vector similarity */
  watchlistMatches: CandidateMatch[];
  patternMetrics: PatternMetrics;
}

export interface Gate2Decision {
  /** Spec vocabulary: VECTOR_ONLY | WATCHLIST | PASS */
  decision: "VECTOR_ONLY" | "WATCHLIST" | "PASS";
  /** Legacy case label kept for internal routing */
  caseDecision: "A" | "B" | "C" | "E";
  track: "RESEARCH" | "INDUSTRY" | "HYBRID" | null;
  matchedPsId?: string | null;
  clusterSize: number;
  evidenceIssueIds: string[];
  reasoning: string;
  /** FIX H3: set true for Case E critical safety bypass */
  urgentEscalation: boolean;
}

export interface ProblemStatementDraft {
  title: string;
  statementText: string;
  category: string;
  affectedArea?: string | null;
  solutionDomain: string;
  targetInstitutionType: string;
  track: "RESEARCH" | "INDUSTRY" | "HYBRID";
  confidence: number;
  evidenceCount: number;
  /** Mongo IDs referenced in the statement — validated against retrieved IDs */
  citedMongoIds: string[];
  embedding?: number[];
  dedupMatchedPsId?: string | null;
  selfCheckPassed: boolean;
  selfCheckRejectionReason?: string | null;
}

/**
 * State annotation for the CivicResolve 2-Gate LangGraph workflow
 */
export const AgentStateAnnotation = Annotation.Root({
  /** FIX H8: unique UUID per pipeline invocation for end-to-end tracing */
  runId: Annotation<string>(),
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
  /** FIX H3: top-level flag so any downstream consumer can check urgency */
  urgentEscalation: Annotation<boolean>({
    default: () => false,
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
