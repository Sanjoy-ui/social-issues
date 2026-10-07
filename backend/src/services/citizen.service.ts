import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { citizens, type Citizen } from "../models/index.js";
import type { RegisterCitizenDTO, LoginCitizenDTO } from "../dto/citizen.dto.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_civic_resolve_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_civic_resolve_2026";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface CitizenTokenPayload {
  citizenId: string;
  email: string;
  fullName: string;
  role: "CITIZEN";
}

/**
 * Generate Access and Refresh JWT Tokens for Citizen
 */
export const generateTokens = (payload: CitizenTokenPayload) => {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): CitizenTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as CitizenTokenPayload;
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): CitizenTokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as CitizenTokenPayload;
};

/**
 * Sanitize Citizen object to exclude sensitive fields
 */
export const sanitizeCitizen = (citizen: Citizen) => {
  const { passwordHash, refreshToken, ...safeCitizen } = citizen;
  return safeCitizen;
};

/**
 * Service: Register Citizen
 */
export const registerCitizen = async (data: RegisterCitizenDTO) => {
  const normalizedEmail = data.email.toLowerCase().trim();

  // 1. Check for duplicate Email
  const existingCitizen = await db
    .select({ id: citizens.id })
    .from(citizens)
    .where(eq(citizens.email, normalizedEmail))
    .limit(1);

  if (existingCitizen.length > 0) {
    const error = new Error(`An account with email '${normalizedEmail}' already exists.`);
    (error as any).statusCode = 409;
    throw error;
  }

  // 2. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  // 3. Generate Citizen ID
  const citizenId = `cit_${crypto.randomUUID()}`;

  // 4. Generate JWT Tokens
  const { accessToken, refreshToken } = generateTokens({
    citizenId,
    email: normalizedEmail,
    fullName: data.fullName.trim(),
    role: "CITIZEN",
  });

  // 5. Insert Citizen Record with Initial Refresh Token
  const [newCitizen] = await db
    .insert(citizens)
    .values({
      id: citizenId,
      fullName: data.fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: data.phone?.trim() || null,
      state: data.state?.trim() || null,
      district: data.district?.trim() || null,
      pincode: data.pincode?.trim() || null,
      refreshToken,
      isActive: true,
      isEmailVerified: false,
    })
    .returning();

  return {
    citizen: sanitizeCitizen(newCitizen),
    accessToken,
    refreshToken,
  };
};

/**
 * Service: Login Citizen
 */
export const loginCitizen = async (data: LoginCitizenDTO) => {
  const normalizedEmail = data.email.toLowerCase().trim();

  // 1. Find Citizen by email
  const records = await db
    .select()
    .from(citizens)
    .where(eq(citizens.email, normalizedEmail))
    .limit(1);

  if (records.length === 0) {
    const error = new Error("Invalid email or password.");
    (error as any).statusCode = 401;
    throw error;
  }

  const currentCitizen = records[0];

  // 2. Validate Password
  const isMatch = await bcrypt.compare(data.password, currentCitizen.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid email or password.");
    (error as any).statusCode = 401;
    throw error;
  }

  // 3. Check Account Status
  if (!currentCitizen.isActive) {
    const error = new Error("This citizen account has been deactivated.");
    (error as any).statusCode = 403;
    throw error;
  }

  // 4. Generate Tokens
  const { accessToken, refreshToken } = generateTokens({
    citizenId: currentCitizen.id,
    email: currentCitizen.email,
    fullName: currentCitizen.fullName,
    role: "CITIZEN",
  });

  // 5. Rotate Refresh Token in DB
  await db
    .update(citizens)
    .set({ refreshToken, updatedAt: new Date() })
    .where(eq(citizens.id, currentCitizen.id));

  return {
    citizen: sanitizeCitizen(currentCitizen),
    accessToken,
    refreshToken,
  };
};

/**
 * Service: Refresh Citizen Session
 */
export const refreshCitizenSession = async (token: string) => {
  let payload: CitizenTokenPayload;

  try {
    payload = verifyRefreshToken(token);
  } catch {
    const error = new Error("Invalid or expired refresh token.");
    (error as any).statusCode = 401;
    throw error;
  }

  // 1. Verify token against database record
  const records = await db
    .select()
    .from(citizens)
    .where(eq(citizens.id, payload.citizenId))
    .limit(1);

  if (records.length === 0 || records[0].refreshToken !== token) {
    const error = new Error("Refresh token revoked or invalid. Please log in again.");
    (error as any).statusCode = 401;
    throw error;
  }

  const currentCitizen = records[0];

  if (!currentCitizen.isActive) {
    const error = new Error("This citizen account has been deactivated.");
    (error as any).statusCode = 403;
    throw error;
  }

  // 2. Rotate Tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    citizenId: currentCitizen.id,
    email: currentCitizen.email,
    fullName: currentCitizen.fullName,
    role: "CITIZEN",
  });

  // 3. Update DB with new Refresh Token
  await db
    .update(citizens)
    .set({ refreshToken: newRefreshToken, updatedAt: new Date() })
    .where(eq(citizens.id, currentCitizen.id));

  return {
    accessToken,
    refreshToken: newRefreshToken,
    citizen: sanitizeCitizen(currentCitizen),
  };
};

/**
 * Service: Invalidate Citizen Session (Logout)
 */
export const logoutCitizen = async (citizenId: string) => {
  await db
    .update(citizens)
    .set({ refreshToken: null, updatedAt: new Date() })
    .where(eq(citizens.id, citizenId));

  return true;
};

/**
 * Service: Get Citizen Profile
 */
export const getCitizenProfile = async (citizenId: string) => {
  const records = await db
    .select()
    .from(citizens)
    .where(eq(citizens.id, citizenId))
    .limit(1);

  if (records.length === 0) {
    const error = new Error("Citizen record not found.");
    (error as any).statusCode = 404;
    throw error;
  }

  return sanitizeCitizen(records[0]);
};
