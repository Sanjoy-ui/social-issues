import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { govtNodal } from "../models/index.js";
import type { RegisterGovtNodalDTO, LoginGovtNodalDTO } from "../dto/govtNodal.dto.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_civic_resolve_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_civic_resolve_2026";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface GovtTokenPayload {
  spocID: string;
  email: string;
  role: "GOVT_NODAL";
  state: string;
  district: string;
}

/**
 * Generate Access and Refresh JWT Tokens
 */
export const generateTokens = (payload: GovtTokenPayload) => {
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
export const verifyRefreshToken = (token: string): GovtTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as GovtTokenPayload;
};

/**
 * Check if a District already has a designated Nodal Officer
 */
export const checkDistrictAvailability = async (state: string, district: string) => {
  const normalizedState = state.trim().toLowerCase();
  const normalizedDistrict = district.trim().toLowerCase();

  const existing = await db
    .select({ id: govtNodal.id, designation: govtNodal.designation })
    .from(govtNodal)
    .where(
      and(
        sql`LOWER(${govtNodal.state}) = ${normalizedState}`,
        sql`LOWER(${govtNodal.district}) = ${normalizedDistrict}`,
        eq(govtNodal.isActive, true)
      )
    )
    .limit(1);

  return {
    available: existing.length === 0,
    state,
    district,
  };
};

/**
 * Service: Register District Nodal Officer
 */
export const registerGovtNodal = async (data: RegisterGovtNodalDTO) => {
  const officialEmail = data.email.toLowerCase().trim();
  const state = data.state.trim();
  const district = data.district.trim();

  // 1. Check for duplicate official email
  const existingEmail = await db
    .select({ id: govtNodal.id })
    .from(govtNodal)
    .where(eq(govtNodal.email, officialEmail))
    .limit(1);

  if (existingEmail.length > 0) {
    const error = new Error(`Official email '${officialEmail}' is already registered.`);
    (error as any).statusCode = 409;
    throw error;
  }

  // 2. Enforce strictly ONE Nodal Officer per District
  const districtCheck = await checkDistrictAvailability(state, district);
  if (!districtCheck.available) {
    const error = new Error(
      `A Nodal Officer is already designated for district '${district}', '${state}'. Each district can only have one designated Nodal Officer.`
    );
    (error as any).statusCode = 409;
    throw error;
  }

  // 3. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  // 4. Generate ID
  const officerId = `govt_nodal_${crypto.randomUUID()}`;

  // 5. Insert Record
  const [newOfficer] = await db
    .insert(govtNodal)
    .values({
      id: officerId,
      firstname: data.firstname.trim(),
      lastname: data.lastname.trim(),
      email: officialEmail,
      passwordHash,
      role: "district_nodal",
      state,
      district,
      department: data.department.trim(),
      designation: data.designation.trim(),
      officeId: data.officeId?.trim() || "",
      contactNo: data.contactNo.trim(),
      isEmailVerified: false,
      isActive: true,
    })
    .returning();

  // 6. Generate Tokens
  const { accessToken, refreshToken } = generateTokens({
    spocID: newOfficer.id,
    email: newOfficer.email,
    role: "GOVT_NODAL",
    state: newOfficer.state,
    district: newOfficer.district,
  });

  // 7. Store Refresh Token in DB
  await db
    .update(govtNodal)
    .set({ refreshToken, updatedAt: new Date() })
    .where(eq(govtNodal.id, newOfficer.id));

  return {
    officer: {
      id: newOfficer.id,
      firstname: newOfficer.firstname,
      lastname: newOfficer.lastname,
      email: newOfficer.email,
      role: newOfficer.role,
      state: newOfficer.state,
      district: newOfficer.district,
      department: newOfficer.department,
      designation: newOfficer.designation,
      officeId: newOfficer.officeId,
      contactNo: newOfficer.contactNo,
      isActive: newOfficer.isActive,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Service: Login District Nodal Officer
 */
export const loginGovtNodal = async (data: LoginGovtNodalDTO) => {
  const officialEmail = data.email.toLowerCase().trim();

  // 1. Find Officer by official email
  const records = await db
    .select()
    .from(govtNodal)
    .where(eq(govtNodal.email, officialEmail))
    .limit(1);

  if (records.length === 0) {
    const error = new Error("Invalid official email or password.");
    (error as any).statusCode = 401;
    throw error;
  }

  const officer = records[0];

  // 2. Validate Password
  const isMatch = await bcrypt.compare(data.password, officer.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid official email or password.");
    (error as any).statusCode = 401;
    throw error;
  }

  // 3. Check Account Status
  if (!officer.isActive) {
    const error = new Error("This government nodal officer account is currently suspended.");
    (error as any).statusCode = 403;
    throw error;
  }

  // 4. Generate Tokens
  const { accessToken, refreshToken } = generateTokens({
    spocID: officer.id,
    email: officer.email,
    role: "GOVT_NODAL",
    state: officer.state,
    district: officer.district,
  });

  // 5. Rotate Refresh Token
  await db
    .update(govtNodal)
    .set({ refreshToken, updatedAt: new Date() })
    .where(eq(govtNodal.id, officer.id));

  return {
    officer: {
      id: officer.id,
      firstname: officer.firstname,
      lastname: officer.lastname,
      email: officer.email,
      role: officer.role,
      state: officer.state,
      district: officer.district,
      department: officer.department,
      designation: officer.designation,
      officeId: officer.officeId,
      contactNo: officer.contactNo,
      isActive: officer.isActive,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Service: Refresh Government Session
 */
export const refreshGovtSession = async (token: string) => {
  let payload: GovtTokenPayload;

  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    const error = new Error("Invalid or expired refresh token.");
    (error as any).statusCode = 401;
    throw error;
  }

  const records = await db
    .select()
    .from(govtNodal)
    .where(eq(govtNodal.id, payload.spocID))
    .limit(1);

  if (records.length === 0 || records[0].refreshToken !== token) {
    const error = new Error("Refresh token revoked or invalid.");
    (error as any).statusCode = 401;
    throw error;
  }

  const currentOfficer = records[0];

  const accessToken = jwt.sign(
    {
      spocID: currentOfficer.id,
      email: currentOfficer.email,
      role: "GOVT_NODAL",
      state: currentOfficer.state,
      district: currentOfficer.district,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions
  );

  return {
    accessToken,
    officer: {
      id: currentOfficer.id,
      firstname: currentOfficer.firstname,
      lastname: currentOfficer.lastname,
      email: currentOfficer.email,
      role: currentOfficer.role,
      state: currentOfficer.state,
      district: currentOfficer.district,
      department: currentOfficer.department,
      designation: currentOfficer.designation,
    },
  };
};

/**
 * Service: Logout Government Officer
 */
export const logoutGovtNodal = async (officerId: string) => {
  await db
    .update(govtNodal)
    .set({ refreshToken: null, updatedAt: new Date() })
    .where(eq(govtNodal.id, officerId));
};

/**
 * Service: Get Current Government Profile
 */
export const getGovtProfile = async (officerId: string) => {
  const records = await db
    .select()
    .from(govtNodal)
    .where(eq(govtNodal.id, officerId))
    .limit(1);

  if (records.length === 0) {
    const error = new Error("Government officer record not found.");
    (error as any).statusCode = 404;
    throw error;
  }

  const officer = records[0];

  return {
    id: officer.id,
    firstname: officer.firstname,
    lastname: officer.lastname,
    email: officer.email,
    role: officer.role,
    state: officer.state,
    district: officer.district,
    department: officer.department,
    designation: officer.designation,
    officeId: officer.officeId,
    contactNo: officer.contactNo,
    isEmailVerified: officer.isEmailVerified,
    isActive: officer.isActive,
    createdAt: officer.createdAt,
  };
};
