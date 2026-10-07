import type { Request, Response } from "express";
import { ZodError } from "zod";
import { OnboardUniversitySchema, LoginUniversitySchema } from "../dto/university.dto.js";
import * as universityService from "../services/university.service.js";

// Cookie options for the Refresh Token
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

/**
 * Controller: Onboard University & SPOC
 * POST /api/v1/university/onboard
 */
export const handleOnboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = OnboardUniversitySchema.parse(req.body);
    const result = await universityService.onboardUniversity(validatedData);

    res.status(201).json({
      success: true,
      message: "University and SPOC onboarded successfully.",
      data: result,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to onboard university",
    });
  }
};

/**
 * Controller: Login University SPOC
 * POST /api/v1/university/login
 */
export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = LoginUniversitySchema.parse(req.body);
    const result = await universityService.loginUniversity(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    // Return Access Token & User details in JSON
    res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken: result.accessToken,
      data: {
        spoc: result.spoc,
        university: result.university,
      },
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid login credentials format",
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

/**
 * Controller: Refresh Access Token
 * POST /api/v1/university/refresh
 */
export const handleRefreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Refresh token is missing. Please log in again.",
      });
      return;
    }

    const newTokens = await universityService.refreshSession(token);

    // Rotate refresh token cookie
    res.cookie("refreshToken", newTokens.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken: newTokens.accessToken,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to refresh session",
    });
  }
};

/**
 * Controller: Logout
 * POST /api/v1/university/logout
 */
export const handleLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.spocID) {
      await universityService.logoutUniversity(req.user.spocID);
    }

    res.clearCookie("refreshToken", getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to logout",
    });
  }
};

/**
 * Controller: Get Current Profile
 * GET /api/v1/university/me
 */
export const handleGetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const spocID = req.user?.spocID;

    if (!spocID) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. SPOC ID not identified.",
      });
      return;
    }

    const profile = await universityService.getUniversityProfile(spocID);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch profile",
    });
  }
};
