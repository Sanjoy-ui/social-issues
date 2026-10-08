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
    minClusterSize: number;
    similarityThreshold: number;
    clusterSimilarityThreshold: number;
    criticalSeverityBypass: boolean;
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
    minClusterSize: 1,
    similarityThreshold: 0.72,
    clusterSimilarityThreshold: 0.65,
    criticalSeverityBypass: true,
  },
};
