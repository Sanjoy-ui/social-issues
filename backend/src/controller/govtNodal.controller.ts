import type { Request, Response } from "express";
import { ZodError } from "zod";
import { RegisterGovtNodalSchema, LoginGovtNodalSchema } from "../dto/govtNodal.dto.js";
import * as govtNodalService from "../services/govtNodal.service.js";

// Cookie options for Refresh Token
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

/**
 * Controller: Register District Nodal Officer
 * POST /api/v1/govt/register
 */
export const handleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = RegisterGovtNodalSchema.parse(req.body);
    const result = await govtNodalService.registerGovtNodal(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      success: true,
      message: "District Nodal Officer registered successfully.",
      accessToken: result.accessToken,
      data: {
        officer: result.officer,
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
      message: error.message || "Failed to register nodal officer",
    });
  }
};

/**
 * Controller: Login Government Nodal Officer
 * POST /api/v1/govt/login
 */
export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = LoginGovtNodalSchema.parse(req.body);
    const result = await govtNodalService.loginGovtNodal(validatedData);

    // Set Refresh Token in httpOnly secure cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: "Government Nodal Officer signed in successfully.",
      accessToken: result.accessToken,
      data: {
        officer: result.officer,
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
 * Controller: Refresh Government Session
 * POST /api/v1/govt/refresh
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

    const result = await govtNodalService.refreshGovtSession(refreshToken);

    res.status(200).json({
      success: true,
      message: "Session token refreshed successfully.",
      accessToken: result.accessToken,
      data: {
        officer: result.officer,
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
 * Controller: Logout Government Officer
 * POST /api/v1/govt/logout
 */
export const handleLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const officerId = req.user?.spocID;

    if (officerId) {
      await govtNodalService.logoutGovtNodal(officerId);
    }

    res.clearCookie("refreshToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    });

    res.status(200).json({
      success: true,
      message: "Government Nodal Officer logged out successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to logout",
    });
  }
};

/**
 * Controller: Get Current Government Officer Profile
 * GET /api/v1/govt/me
 */
export const handleGetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const officerId = req.user?.spocID;

    if (!officerId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Officer ID not found.",
      });
      return;
    }

    const profile = await govtNodalService.getGovtProfile(officerId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch government profile",
    });
  }
};

/**
 * Controller: Check District Availability
 * GET /api/v1/govt/check-district?state=...&district=...
 */
export const handleCheckDistrict = async (req: Request, res: Response): Promise<void> => {
  try {
    const { state, district } = req.query;

    if (!state || !district) {
      res.status(400).json({
        success: false,
        message: "State and District query parameters are required.",
      });
      return;
    }

    const result = await govtNodalService.checkDistrictAvailability(
      String(state),
      String(district)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check district availability",
    });
  }
};

/**
 * Controller: Get All Tripura Districts with Availability Status
 * GET /api/v1/govt/districts
 */
export const handleGetTripuraDistricts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const districts = await govtNodalService.getTripuraDistrictsStatus();
    res.status(200).json({
      success: true,
      data: {
        state: "Tripura",
        totalDistricts: districts.length,
        districts,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Tripura districts",
    });
  }
};

/**
 * Controller: Get Paginated Problem Statements
 * GET /api/v1/govt/problem-statements
 */
export const handleGetProblemStatements = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 6));
    const status = (req.query.status as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const district = (req.query.district as string) || undefined;

    const result = await govtNodalService.getPaginatedProblemStatements({
      page,
      limit,
      status,
      category,
      district,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch problem statements",
    });
  }
};

/**
 * Controller: Get Registered Higher Education Institutions
 * GET /api/v1/govt/higher-education
 */
export const handleGetHigherEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 6));
    const search = (req.query.search as string) || undefined;

    const result = await govtNodalService.getHigherEducationInstitutions({
      page,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch higher education institutions",
    });
  }
};

/**
 * Controller: Get Registered Industry Partners & Companies
 * GET /api/v1/govt/industries
 */
export const handleGetIndustries = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 6));
    const search = (req.query.search as string) || undefined;
    const type = (req.query.type as string) || undefined;

    const result = await govtNodalService.getIndustryPartners({
      page,
      limit,
      search,
      type,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch industry partners",
    });
  }
};


