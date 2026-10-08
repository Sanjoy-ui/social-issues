import type { Request, Response } from "express";
import { checkAgentHealth } from "../ai/services/agentHealth.service.js";

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
