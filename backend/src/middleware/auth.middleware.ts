import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../services/university.service.js";

export type AuthUser = {
  spocID?: string;
  citizenId?: string;
  role: "UNIVERSITY_SPOC" | "INDUSTRY_SPOC" | "GOVT_NODAL" | "CITIZEN" | string;
  email?: string;
  fullName?: string;
  universityEmail?: string;
  universityID?: string;
  industryID?: string;
  state?: string;
  district?: string;
};

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to verify Access Token from Bearer header or Cookie
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Missing access token.",
      error: "Unauthorized",
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload as unknown as AuthUser;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
      error: "TokenExpiredOrInvalid",
    });
  }
};

/**
 * Middleware that extracts user context if present, but does not block unauthenticated users
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = payload as unknown as AuthUser;
    } catch {
      // Ignore token verification errors for optional auth
    }
  }

  next();
};
