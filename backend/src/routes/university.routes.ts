import { Router } from "express";
import {
  handleOnboard,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  handleGetProfile,
  handleGetAvailableProblemStatements,
  handleClaimProblemStatement,
  handleGetAssignedProjects,
  handleGetUniversityProposals,
  handleReviewProposal,
} from "../controller/university.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/onboard", handleOnboard);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);

// Protected / Session routes
router.post("/logout", optionalAuth, handleLogout);
router.get("/me", requireAuth, handleGetProfile);

// Problem Statement Claiming & Research Workflows
router.get("/problem-statements", optionalAuth, handleGetAvailableProblemStatements);
router.post("/problem-statements/:id/claim", requireAuth, handleClaimProblemStatement);
router.get("/assigned-projects", requireAuth, handleGetAssignedProjects);

// Industry Solution Proposals & Collaboration
router.get("/industry-proposals", requireAuth, handleGetUniversityProposals);
router.patch("/industry-proposals/:id/review", requireAuth, handleReviewProposal);

export default router;
