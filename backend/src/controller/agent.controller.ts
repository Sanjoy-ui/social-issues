import type { Request, Response } from "express";
import { checkAgentHealth } from "../ai/services/agentHealth.service.js";
import { agentQueue } from "../ai/services/agentQueue.service.js";

/**
 * Controller: Check AI Agent health and subsystem readiness
 * GET /api/v1/agent/health
 */
export const handleAgentHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const quick = req.query.quick === "true";
    const health = await checkAgentHealth({ quick });

    const statusCode = health.status === "down" ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: "down",
      message: "Agent health check encountered an internal error",
      error: error.message || "Unknown error",
    });
  }
};

/**
 * Controller: Get AI Agent processing queue stats and database counts
 * GET /api/v1/agent/queue
 */
export const handleAgentQueueStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await agentQueue.getStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch queue statistics",
      error: error.message || "Unknown error",
    });
  }
};

/**
 * Controller: Manually re-enqueue all failed issues
 * POST /api/v1/agent/queue/retry-failed
 */
export const handleRetryFailedQueue = async (_req: Request, res: Response): Promise<void> => {
  try {
    const retriedCount = await agentQueue.retryFailed();
    res.status(200).json({
      success: true,
      message: `Re-enqueued ${retriedCount} failed issue(s) for AI processing.`,
      retriedCount,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to re-enqueue failed issues",
      error: error.message || "Unknown error",
    });
  }
};

