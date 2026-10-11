import dotenv from "dotenv";

dotenv.config();

export interface AgentConfiguration {
  provider: "nvidia";
  nvidia: {
    apiKey: string;
    model: string;
    baseUrl: string;
    reasoningEffort?: string;
    embeddingModel: string;
  };
  gate1: {
    enabled: boolean;
    researchableDomains: string[];
    nonResearchableDomains: string[];
  };
  gate2: {
    enabled: boolean;
    /** Minimum distinct-reporter cluster size to trigger PS synthesis (Case B).
     *  FIX B2: was 1 — any single report fired synthesis. Now defaults to 3. */
    minClusterSize: number;
    /** Cosine similarity >= this → join existing live PS (Case A) */
    similarityThreshold: number;
    /** Cosine similarity >= this → count issue toward cluster (Case B) */
    clusterSimilarityThreshold: number;
    /** Cosine similarity >= this → treat synthesised PS as duplicate of existing */
    dedupSimilarityThreshold: number;
    criticalSeverityBypass: boolean;
    /** FIX H5: When true, unassigned (WATCHLIST) issues are re-evaluated when
     *  new similar issues arrive. */
    watchlistEnabled: boolean;
    /** FIX H3: pg_notify channel for urgent (Case E) escalation alerts */
    urgentEscalationChannel: string;
  };
  queue: {
    concurrency: number;
    pollIntervalMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };
}

export const agentConfig: AgentConfiguration = {
  provider: "nvidia",
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || "",
    model: process.env.NVIDIA_MODEL || "meta/llama-3.2-11b-vision-instruct",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    reasoningEffort: "low",
    embeddingModel:
      process.env.NVIDIA_EMBEDDING_MODEL || "nvidia/llama-nemotron-embed-vl-1b-v2",
  },
  gate1: {
    enabled: true,
    researchableDomains: [
      "infrastructure/GIS",
      "agri-tech",
      "health-tech",
      "ed-tech",
      "environment/sustainability",
      "accessibility",
      "digital-safety",
      "disaster-response",
    ],
    nonResearchableDomains: [
      "personal-disputes",
      "law-and-order",
      "one-off-administrative",
      "defamation-abuse",
    ],
  },
  gate2: {
    enabled: true,
    minClusterSize: parseInt(process.env.AGENT_MIN_CLUSTER_SIZE || "3", 10),
    similarityThreshold: parseFloat(process.env.AGENT_PS_SIMILARITY_THRESHOLD || "0.82"),
    clusterSimilarityThreshold: parseFloat(process.env.AGENT_CLUSTER_SIMILARITY_THRESHOLD || "0.65"),
    // FIX M6: was hardcoded 0.88 in synthesizeNode.ts:141
    dedupSimilarityThreshold: parseFloat(process.env.AGENT_DEDUP_SIMILARITY_THRESHOLD || "0.88"),
    criticalSeverityBypass: true,
    watchlistEnabled: true,
    urgentEscalationChannel: process.env.AGENT_URGENT_CHANNEL || "urgent_escalation_events",
  },
  queue: {
    concurrency: parseInt(process.env.AGENT_QUEUE_CONCURRENCY || "1", 10),
    pollIntervalMs: parseInt(process.env.AGENT_QUEUE_POLL_INTERVAL_MS || "5000", 10),
    maxRetries: parseInt(process.env.AGENT_QUEUE_MAX_RETRIES || "3", 10),
    retryDelayMs: parseInt(process.env.AGENT_QUEUE_RETRY_DELAY_MS || "2000", 10),
  },
};
