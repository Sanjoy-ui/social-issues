import mongoose from "mongoose";
import { pool } from "../../config/db.js";
import cloudinary from "../../config/cloudinary.js";
import { agentConfig } from "../config/agent.config.js";
import { testLLMConnectivity, type LLMTestResult } from "../client/llm.client.js";
import { isGraphCompiled } from "../graph/agent.graph.js";

export interface AgentHealthResponse {
  success: boolean;
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  agent: {
    name: string;
    version: string;
    framework: string;
    pipeline: string;
    graphCompiled: boolean;
  };
  checks: {
    llm: {
      status: "connected" | "failed" | "skipped";
      provider: string;
      model: string;
      latencyMs?: number;
      sampleResponse?: string;
      error?: string;
    };
    database: {
      postgres: "connected" | "disconnected";
      mongo: "connected" | "disconnected";
    };
    storage: {
      cloudinary: "connected" | "disconnected";
    };
    cloudinary: {
      status: "connected" | "disconnected";
      cloudName?: string;
      error?: string;
    };
    configuration: {
      hasApiKey: boolean;
      hasCloudinary: boolean;
      gate1Enabled: boolean;
      gate2Enabled: boolean;
    };
  };
}

/**
 * Runs a health and readiness audit for the AI Agent subsystem
 */
export async function checkAgentHealth(options?: { quick?: boolean }): Promise<AgentHealthResponse> {
  const isCompiled = isGraphCompiled();
  const activeProvider = agentConfig.provider;
  const activeModel = agentConfig.nvidia.model;
  const hasApiKey = Boolean(agentConfig.nvidia.apiKey);
  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  // 1. LLM Connectivity check
  let llmCheck: LLMTestResult | null = null;
  if (options?.quick) {
    llmCheck = {
      ok: hasApiKey,
      provider: activeProvider,
      model: activeModel,
      latencyMs: 0,
      sampleResponse: "Skipped (quick mode)",
    };
  } else {
    llmCheck = await testLLMConnectivity();
  }

  // 2. Database checks
  let pgStatus: "connected" | "disconnected" = "disconnected";
  try {
    await pool.query("SELECT 1");
    pgStatus = "connected";
  } catch (err) {
    pgStatus = "disconnected";
  }

  const mongoStatus: "connected" | "disconnected" =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  // 3. Cloudinary Storage check
  let cloudinaryStatus: "connected" | "disconnected" = "disconnected";
  let cloudinaryError: string | undefined;

  if (hasCloudinary) {
    try {
      const pingResult = await cloudinary.api.ping();
      if (pingResult && (pingResult.status === "ok" || typeof pingResult === "object")) {
        cloudinaryStatus = "connected";
      }
    } catch (err: any) {
      cloudinaryStatus = "disconnected";
      cloudinaryError = err?.message || "Cloudinary ping failed";
    }
  } else {
    cloudinaryError = "Cloudinary environment variables missing";
  }

  // 4. Status determination
  let overallStatus: "healthy" | "degraded" | "down" = "healthy";
  if (!isCompiled || !hasApiKey) {
    overallStatus = "down";
  } else if (
    !llmCheck.ok ||
    pgStatus === "disconnected" ||
    mongoStatus === "disconnected" ||
    cloudinaryStatus === "disconnected"
  ) {
    overallStatus = "degraded";
  }

  return {
    success: overallStatus !== "down",
    status: overallStatus,
    timestamp: new Date().toISOString(),
    agent: {
      name: "CivicResolve-ProblemSynthesisAgent",
      version: "1.0.0",
      framework: "LangGraph",
      pipeline: "2-Gate (Solvability + Pattern Cluster)",
      graphCompiled: isCompiled,
    },
    checks: {
      llm: {
        status: options?.quick ? "skipped" : llmCheck.ok ? "connected" : "failed",
        provider: llmCheck.provider,
        model: llmCheck.model,
        latencyMs: llmCheck.latencyMs,
        sampleResponse: llmCheck.sampleResponse,
        error: llmCheck.error,
      },
      database: {
        postgres: pgStatus,
        mongo: mongoStatus,
      },
      storage: {
        cloudinary: cloudinaryStatus,
      },
      cloudinary: {
        status: cloudinaryStatus,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || undefined,
        ...(cloudinaryError ? { error: cloudinaryError } : {}),
      },
      configuration: {
        hasApiKey,
        hasCloudinary,
        gate1Enabled: agentConfig.gate1.enabled,
        gate2Enabled: agentConfig.gate2.enabled,
      },
    },
  };
}
