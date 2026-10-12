import { Router } from "express";
import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  handleGetProfile,
  handleCheckDistrict,
  handleGetTripuraDistricts,
  handleGetProblemStatements,
  handleGetHigherEducation,
  handleGetIndustries,
} from "../controller/govtNodal.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public / General routes
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);
router.get("/check-district", handleCheckDistrict);
router.get("/districts", handleGetTripuraDistricts);
router.get("/problem-statements", requireAuth, handleGetProblemStatements);
router.get("/higher-education", requireAuth, handleGetHigherEducation);
router.get("/industries", requireAuth, handleGetIndustries);

// Protected / Session routes
router.post("/logout", optionalAuth, handleLogout);
router.get("/me", requireAuth, handleGetProfile);

export default router;
