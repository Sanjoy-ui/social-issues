import { Router } from "express";
import {
  handleAgentHealth,
  handleAgentQueueStats,
  handleRetryFailedQueue,
} from "../controller/agent.controller.js";

const router = Router();

// Agent Health check route
router.get("/health", handleAgentHealth);

// Agent Queue status & telemetry
router.get("/queue", handleAgentQueueStats);

// Manual re-enqueue for failed issues
router.post("/queue/retry-failed", handleRetryFailedQueue);

export default router;
