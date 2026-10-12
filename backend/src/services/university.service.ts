import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or, and, desc, isNull, ne, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  university,
  universitySpoc,
  problemStatements,
  industryProposals,
  industryPartners,
  industrySpoc,
} from "../models/index.js";
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

export interface AvailableProblemStatementsOptions {
  page?: number;
  limit?: number;
}

/**
 * Service: Fetch Available (Unclaimed) Problem Statements for Universities
 */
export const getAvailableProblemStatements = async (options: AvailableProblemStatementsOptions = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 6));
  const offset = (page - 1) * limit;

  // Only open problem statements that have NOT been claimed by any institution
  const whereCondition = and(
    isNull(problemStatements.claimedByUniversityId),
    ne(problemStatements.status, "claimed"),
    ne(problemStatements.status, "assigned")
  );

  // Total matching count
  const countRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(problemStatements)
    .where(whereCondition);

  const total = countRes[0]?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Paginated rows ordered by createdAt DESC
  const items = await db
    .select()
    .from(problemStatements)
    .where(whereCondition)
    .orderBy(desc(problemStatements.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Service: Claim a Problem Statement for Research (Single-Institution Exclusivity)
 */
export const claimProblemStatement = async (
  psId: string,
  universityId: string,
  spocId: string
) => {
  // 1. Atomic update where claimedByUniversityId IS NULL to prevent race conditions
  const updated = await db
    .update(problemStatements)
    .set({
      claimedByUniversityId: universityId,
      claimedBySpocId: spocId,
      claimedAt: new Date(),
      status: "claimed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(problemStatements.id, psId),
        isNull(problemStatements.claimedByUniversityId)
      )
    )
    .returning();

  if (updated.length > 0) {
    return updated[0];
  }

  // If update returned 0 rows, check whether the problem statement exists or was already claimed
  const [existing] = await db
    .select({
      id: problemStatements.id,
      claimedByUniversityId: problemStatements.claimedByUniversityId,
      status: problemStatements.status,
    })
    .from(problemStatements)
    .where(eq(problemStatements.id, psId))
    .limit(1);

  if (!existing) {
    const error = new Error("Problem statement not found");
    (error as any).statusCode = 404;
    throw error;
  }

  // Already claimed by another institution
  const error = new Error(
    "This problem statement has already been claimed for research by another institution"
  );
  (error as any).statusCode = 409;
  throw error;
};

/**
 * Service: Fetch Problem Statements Claimed by a Specific University (Assigned Projects)
 */
export const getAssignedProjects = async (
  universityId: string,
  options: AvailableProblemStatementsOptions = {}
) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 6));
  const offset = (page - 1) * limit;

  const whereCondition = eq(problemStatements.claimedByUniversityId, universityId);

  // Total matching count
  const countRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(problemStatements)
    .where(whereCondition);

  const total = countRes[0]?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Paginated rows ordered by claimedAt DESC
  const items = await db
    .select()
    .from(problemStatements)
    .where(whereCondition)
    .orderBy(desc(problemStatements.claimedAt))
    .limit(limit)
    .offset(offset);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export interface UniversityProposalsOptions {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * Service: Fetch Proposals received by a University from Industry Partners
 */
export const getUniversityProposals = async (
  universityId: string,
  options: UniversityProposalsOptions = {}
) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  const baseConditions = [eq(industryProposals.universityId, universityId)];

  if (options.status && options.status !== "all") {
    baseConditions.push(eq(industryProposals.status, options.status));
  }

  const whereClause = and(...baseConditions);

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(industryProposals)
    .where(whereClause);

  const total = countRes?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const items = await db
    .select({
      id: industryProposals.id,
      proposalTitle: industryProposals.proposalTitle,
      proposalSummary: industryProposals.proposalSummary,
      contributionType: industryProposals.contributionType,
      estimatedTimeline: industryProposals.estimatedTimeline,
      documentUrl: industryProposals.documentUrl,
      documentPublicId: industryProposals.documentPublicId,
      documentName: industryProposals.documentName,
      documentFormat: industryProposals.documentFormat,
      status: industryProposals.status,
      collegeFeedback: industryProposals.collegeFeedback,
      reviewedAt: industryProposals.reviewedAt,
      createdAt: industryProposals.createdAt,
      problemStatement: {
        id: problemStatements.id,
        title: problemStatements.title,
        category: problemStatements.category,
        statementText: problemStatements.statementText,
      },
      industryPartner: {
        id: industryPartners.id,
        name: industryPartners.name,
        type: industryPartners.type,
        sectorTags: industryPartners.sectorTags,
        location: industryPartners.location,
        contactDetails: industryPartners.contactDetails,
      },
      industrySpoc: {
        id: industrySpoc.id,
        firstname: industrySpoc.firstname,
        lastname: industrySpoc.lastname,
        email: industrySpoc.email,
        phone: industrySpoc.phone,
        designation: industrySpoc.designation,
      },
    })
    .from(industryProposals)
    .innerJoin(
      problemStatements,
      eq(industryProposals.problemStatementId, problemStatements.id)
    )
    .innerJoin(
      industryPartners,
      eq(industryProposals.industryId, industryPartners.id)
    )
    .innerJoin(
      industrySpoc,
      eq(industryProposals.industrySpocId, industrySpoc.id)
    )
    .where(whereClause)
    .orderBy(desc(industryProposals.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Service: Review (Accept/Reject) an Industry Proposal
 */
export const reviewIndustryProposal = async (
  proposalId: string,
  universityId: string,
  spocId: string,
  status: "accepted" | "rejected",
  feedback?: string
) => {
  const [existing] = await db
    .select()
    .from(industryProposals)
    .where(
      and(
        eq(industryProposals.id, proposalId),
        eq(industryProposals.universityId, universityId)
      )
    )
    .limit(1);

  if (!existing) {
    const error = new Error("Proposal not found or does not belong to your university");
    (error as any).statusCode = 404;
    throw error;
  }

  const [updated] = await db
    .update(industryProposals)
    .set({
      status,
      collegeFeedback: feedback?.trim() || null,
      reviewedAt: new Date(),
      reviewedBySpocId: spocId,
      updatedAt: new Date(),
    })
    .where(eq(industryProposals.id, proposalId))
    .returning();

  return updated;
};
