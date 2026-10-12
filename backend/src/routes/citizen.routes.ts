import { Router } from "express";
import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  handleGetProfile,
} from "../controller/citizen.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);

// Protected / Session routes
router.post("/logout", optionalAuth, handleLogout);
router.get("/me", requireAuth, handleGetProfile);

export default router;
