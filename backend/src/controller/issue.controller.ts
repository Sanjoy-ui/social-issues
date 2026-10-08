import type { Request, Response } from "express";
import { ZodError } from "zod";
import { CreateIssueSchema } from "../dto/issue.dto.js";
import * as issueService from "../services/issue.service.js";
import { triggerAgentForIssue } from "../ai/index.js";

/**
 * Controller: Register a new Civic Issue
 * POST /api/v1/issue/register
 */
export const handleRegisterIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = CreateIssueSchema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) || [];

    // Authenticated reporter context from token middleware (if available)
    const reporterContext = req.user
      ? {
          citizenId: req.user.citizenId,
          fullName: req.user.fullName,
          email: req.user.email,
        }
      : undefined;

    const newIssue = await issueService.registerIssue(validatedData, files, reporterContext);

    // Trigger AI Agent pipeline asynchronously (non-blocking)
    setImmediate(() => {
      triggerAgentForIssue(newIssue);
    });

    res.status(201).json({
      success: true,
      message: "Civic issue registered successfully.",
      data: {
        issue: newIssue,
      },
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid issue submission data",
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to register civic issue",
    });
  }
};

/**
 * Controller: Get logged-in citizen's submitted issues
 * GET /api/v1/issue/my-reports
 */
export const handleGetMyIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const citizenId = req.user?.citizenId;

    if (!citizenId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Citizen identification required.",
      });
      return;
    }

    const issues = await issueService.getCitizenIssues(citizenId);

    res.status(200).json({
      success: true,
      data: {
        issues,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch citizen issues",
    });
  }
};

/**
 * Controller: Get single issue details by ID
 * GET /api/v1/issue/:id
 */
export const handleGetIssueById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const issueId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!issueId) {
      res.status(400).json({ success: false, message: "Issue ID is required" });
      return;
    }
    const issue = await issueService.getIssueById(issueId);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Issue not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        issue,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve issue",
    });
  }
};
