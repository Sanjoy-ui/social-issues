import { Router } from "express";
import { handleAgentHealth } from "../controller/agent.controller.js";

const router = Router();

// Agent Health check route
router.get("/health", handleAgentHealth);

export default router;
