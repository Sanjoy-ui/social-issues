import { Router } from "express";
import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  handleGetProfile,
  handleCheckDistrict,
} from "../controller/govtNodal.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);
router.get("/check-district", handleCheckDistrict);

// Protected routes (Require valid access token)
router.post("/logout", requireAuth, handleLogout);
router.get("/me", requireAuth, handleGetProfile);

export default router;
