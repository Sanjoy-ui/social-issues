import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { university, universitySpoc } from "../models/index.js";
import type { OnboardUniversityDTO, LoginUniversityDTO } from "../dto/university.dto.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_civic_resolve_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_civic_resolve_2026";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface TokenPayload {
  spocID: string;
  universityID: string;
  universityEmail: string;
  role: "UNIVERSITY_SPOC";
}

/**
 * Generate Access and Refresh JWT Tokens
 */
export const generateTokens = (payload: TokenPayload) => {
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
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
};

/**
 * Service: University Onboarding
 */
export const onboardUniversity = async (data: OnboardUniversityDTO) => {
  // 1. Check for duplicate AISHECode
  const existingUniv = await db
    .select({ id: university.universityID })
    .from(university)
    .where(eq(university.AISHECode, data.AISHECode))
    .limit(1);

  if (existingUniv.length > 0) {
    const error = new Error(`University with AISHE Code '${data.AISHECode}' is already registered.`);
    (error as any).statusCode = 409;
    throw error;
  }

  // 2. Check for duplicate SPOC Email
  const existingEmail = await db
    .select({ id: universitySpoc.spocID })
    .from(universitySpoc)
    .where(eq(universitySpoc.universityEmail, data.spoc.universityEmail.toLowerCase()))
    .limit(1);

  if (existingEmail.length > 0) {
    const error = new Error(`Institutional email '${data.spoc.universityEmail}' is already registered.`);
    (error as any).statusCode = 409;
    throw error;
  }

  // 3. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.spoc.password, salt);

  // 4. Generate IDs
  const universityID = `univ_${crypto.randomUUID()}`;
  const spocID = `spoc_${crypto.randomUUID()}`;

  // 5. Atomic Insertion in Transaction
  return await db.transaction(async (tx) => {
    // Insert University
    const [newUniv] = await tx
      .insert(university)
      .values({
        universityID,
        universityName: data.universityName,
        universityAddress: data.universityAddress || "",
        universityContactNo: data.universityContactNo || "",
        universityWebsiteLink: data.universityWebsiteLink || "",
        AISHECode: data.AISHECode,
        isUniversityActive: true,
        isUniversityVerified: false,
        universityResearchDepartments: data.universityResearchDepartments || [],
      })
      .returning();

    // Insert SPOC
    const [newSpoc] = await tx
      .insert(universitySpoc)
      .values({
        spocID,
        universityID,
        firstname: data.spoc.firstname,
        lastname: data.spoc.lastname,
        universityEmail: data.spoc.universityEmail.toLowerCase(),
        passwordHash,
        positionTitle: data.spoc.positionTitle || "SPOC",
        departmentSpoc: data.spoc.departmentSpoc || "General",
      })
      .returning();

    // Strip passwordHash before returning
    const { passwordHash: _, ...safeSpoc } = newSpoc;

    return {
      university: newUniv,
      spoc: safeSpoc,
    };
  });
};

/**
 * Service: University Login
 */
export const loginUniversity = async (data: LoginUniversityDTO) => {
  const email = data.universityEmail.toLowerCase().trim();

  // 1. Fetch SPOC
  const [spocUser] = await db
    .select()
    .from(universitySpoc)
    .where(eq(universitySpoc.universityEmail, email))
    .limit(1);

  if (!spocUser) {
    const error = new Error("Invalid institutional email or password");
    (error as any).statusCode = 401;
    throw error;
  }

  // 2. Fetch associated University
  const [univ] = await db
    .select()
    .from(university)
    .where(eq(university.universityID, spocUser.universityID!))
    .limit(1);

  if (!univ) {
    const error = new Error("Associated university record not found");
    (error as any).statusCode = 404;
    throw error;
  }

  if (!univ.isUniversityActive) {
    const error = new Error("This university account has been deactivated. Please contact support.");
    (error as any).statusCode = 403;
    throw error;
  }

  // 3. Verify Password
  const isMatch = await bcrypt.compare(data.password, spocUser.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid institutional email or password");
    (error as any).statusCode = 401;
    throw error;
  }

  // 4. Generate Tokens
  const { accessToken, refreshToken } = generateTokens({
    spocID: spocUser.spocID,
    universityID: spocUser.universityID!,
    universityEmail: spocUser.universityEmail,
    role: "UNIVERSITY_SPOC",
  });

  // 5. Store current active refreshToken hash/token in DB for session revocation
  await db
    .update(universitySpoc)
    .set({ refreshToken, updatedAt: new Date() })
    .where(eq(universitySpoc.spocID, spocUser.spocID));

  const { passwordHash: _, refreshToken: __, ...safeSpoc } = spocUser;

  return {
    accessToken,
    refreshToken,
    spoc: safeSpoc,
    university: univ,
  };
};

/**
 * Service: Refresh Access Token
 */
export const refreshSession = async (token: string) => {
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    const error = new Error("Invalid or expired refresh token");
    (error as any).statusCode = 401;
    throw error;
  }

  // Verify that the refresh token matches the one in DB
  const [spocUser] = await db
    .select()
    .from(universitySpoc)
    .where(eq(universitySpoc.spocID, payload.spocID))
    .limit(1);

  if (!spocUser || spocUser.refreshToken !== token) {
    const error = new Error("Session expired or revoked. Please log in again.");
    (error as any).statusCode = 401;
    throw error;
  }

  // Rotate tokens
  const newTokens = generateTokens({
    spocID: spocUser.spocID,
    universityID: spocUser.universityID!,
    universityEmail: spocUser.universityEmail,
    role: "UNIVERSITY_SPOC",
  });

  await db
    .update(universitySpoc)
    .set({ refreshToken: newTokens.refreshToken, updatedAt: new Date() })
    .where(eq(universitySpoc.spocID, spocUser.spocID));

  return newTokens;
};

/**
 * Service: Logout (Revoke Refresh Token)
 */
export const logoutUniversity = async (spocID: string) => {
  await db
    .update(universitySpoc)
    .set({ refreshToken: null, updatedAt: new Date() })
    .where(eq(universitySpoc.spocID, spocID));
};

/**
 * Service: Get Profile
 */
export const getUniversityProfile = async (spocID: string) => {
  const [spocUser] = await db
    .select()
    .from(universitySpoc)
    .where(eq(universitySpoc.spocID, spocID))
    .limit(1);

  if (!spocUser) {
    const error = new Error("User profile not found");
    (error as any).statusCode = 404;
    throw error;
  }

  const [univ] = await db
    .select()
    .from(university)
    .where(eq(university.universityID, spocUser.universityID!))
    .limit(1);

  const { passwordHash: _, refreshToken: __, ...safeSpoc } = spocUser;

  return {
    spoc: safeSpoc,
    university: univ,
  };
};
