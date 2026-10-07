import type { Request, Response } from "express";
import { ZodError } from "zod";
import { RegisterCitizenSchema, LoginCitizenSchema } from "../dto/citizen.dto.js";
import * as citizenService from "../services/citizen.service.js";

// Cookie options for Refresh Token
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

/**
 * Controller: Register Citizen
 * POST /api/v1/citizen/register
 */
export const handleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = RegisterCitizenSchema.parse(req.body);
    const result = await citizenService.registerCitizen(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      success: true,
      message: "Citizen registered successfully.",
      accessToken: result.accessToken,
      data: {
        citizen: result.citizen,
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
      message: error.message || "Failed to register citizen",
    });
  }
};

/**
 * Controller: Login Citizen
 * POST /api/v1/citizen/login
 */
export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = LoginCitizenSchema.parse(req.body);
    const result = await citizenService.loginCitizen(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken: result.accessToken,
      data: {
        citizen: result.citizen,
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
 * Controller: Refresh Citizen Access Token
 * POST /api/v1/citizen/refresh
 */
export const handleRefreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Refresh token is missing. Please log in again.",
      });
      return;
    }

    const result = await citizenService.refreshCitizenSession(token);

    // Update Refresh Token cookie with rotated token
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken: result.accessToken,
      data: {
        citizen: result.citizen,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Could not refresh token",
    });
  }
};

/**
 * Controller: Logout Citizen
 * POST /api/v1/citizen/logout
 */
export const handleLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const citizenId = req.user?.citizenId;

    if (citizenId) {
      await citizenService.logoutCitizen(citizenId);
    }

    res.clearCookie("refreshToken", getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to log out",
    });
  }
};

/**
 * Controller: Get Current Citizen Profile
 * GET /api/v1/citizen/me
 */
export const handleGetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const citizenId = req.user?.citizenId;

    if (!citizenId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Citizen identification missing.",
      });
      return;
    }

    const profile = await citizenService.getCitizenProfile(citizenId);

    res.status(200).json({
      success: true,
      data: {
        citizen: profile,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch profile",
    });
  }
};
