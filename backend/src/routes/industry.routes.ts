import { Router } from "express";
import multer from "multer";
import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  handleGetProfile,
  handleGetHeActiveProjects,
  handleCreateProposal,
  handleGetIndustryProposals,
} from "../controller/industry.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
});

const router = Router();

// Public routes
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);

// Protected / Session routes
router.post("/logout", optionalAuth, handleLogout);
router.get("/me", requireAuth, handleGetProfile);

// Higher Education Active Projects for Industry Collaboration
router.get("/he-active-projects", optionalAuth, handleGetHeActiveProjects);

// Solution Proposals Submission & Tracking
router.post("/proposals", requireAuth, upload.single("document"), handleCreateProposal);
router.get("/my-proposals", requireAuth, handleGetIndustryProposals);

export default router;
