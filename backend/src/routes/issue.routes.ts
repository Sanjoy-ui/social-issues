import { Router } from "express";
import multer from "multer";
import {
  handleRegisterIssue,
  handleGetMyIssues,
  handleGetIssueById,
} from "../controller/issue.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Configure Multer for in-memory uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
    files: 5, // max 5 files per issue
  },
  fileFilter: (_req, file, cb) => {
    // Allowed MIME types: images, pdf, and short videos
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: Images, PDF, MP4.`));
    }
  },
});

// Issue Registration endpoint (Supports multipart form data with optional authentication)
router.post(
  "/register",
  optionalAuth,
  upload.array("issue_proof", 5),
  handleRegisterIssue
);

// Get My Reported Issues (Requires citizen authentication)
router.get("/my-reports", requireAuth, handleGetMyIssues);

// Get issue details by ID (Public)
router.get("/:id", handleGetIssueById);

export default router;
