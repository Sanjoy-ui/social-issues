import { Router } from "express";
import {
  handleOnboard,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  handleGetProfile,
} from "../controller/university.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/onboard", handleOnboard);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);

// Protected routes (Require valid access token)
router.post("/logout", requireAuth, handleLogout);
router.get("/me", requireAuth, handleGetProfile);

export default router;
