import type { Request, Response } from "express";
import { ZodError } from "zod";
import { RegisterIndustrySchema, LoginIndustrySchema } from "../dto/industry.dto.js";
import * as industryService from "../services/industry.service.js";

// Cookie options for the Refresh Token
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

/**
 * Controller: Register Industry Partner & SPOC
 * POST /api/v1/industry/register
 */
export const handleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = RegisterIndustrySchema.parse(req.body);
    const result = await industryService.registerIndustry(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      success: true,
      message: "Industry partner and SPOC registered successfully.",
      accessToken: result.accessToken,
      data: {
        partner: result.partner,
        spoc: result.spoc,
      },
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
      message: error.message || "Failed to register industry partner",
    });
  }
};

/**
 * Controller: Login Industry SPOC
 * POST /api/v1/industry/login
 */
export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = LoginIndustrySchema.parse(req.body);
    const result = await industryService.loginIndustry(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Industry SPOC signed in successfully.",
      accessToken: result.accessToken,
      data: {
        partner: result.partner,
        spoc: result.spoc,
      },
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
      message: error.message || "Login failed",
    });
  }
};

/**
 * Controller: Refresh Session
 * POST /api/v1/industry/refresh
 */
export const handleRefreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token missing from cookies.",
      });
      return;
    }

    const result = await industryService.refreshIndustrySession(refreshToken);

    res.status(200).json({
      success: true,
      message: "Session token refreshed successfully.",
      accessToken: result.accessToken,
      data: {
        spoc: result.spoc,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to refresh token",
    });
  }
};

/**
 * Controller: Logout Industry SPOC
 * POST /api/v1/industry/logout
 */
export const handleLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const spocID = req.user?.spocID;

    if (spocID) {
      await industryService.logoutIndustry(spocID);
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    });

    res.status(200).json({
      success: true,
      message: "Industry SPOC logged out successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to logout",
    });
  }
};

/**
 * Controller: Get Current Industry Profile
 * GET /api/v1/industry/me
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

    const profile = await industryService.getIndustryProfile(spocID);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch industry profile",
    });
  }
};
