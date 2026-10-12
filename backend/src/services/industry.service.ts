import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and, or, ne, isNotNull, ilike, desc, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  industryPartners,
  industrySpoc,
  problemStatements,
  university,
  universitySpoc,
  industryProposals,
} from "../models/index.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.util.js";
import type { RegisterIndustryDTO, LoginIndustryDTO } from "../dto/industry.dto.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_civic_resolve_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_civic_resolve_2026";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface IndustryTokenPayload {
  spocID: string;
  industryID: string;
  email: string;
  role: "INDUSTRY_SPOC";
}

/**
 * Generate Access and Refresh JWT Tokens
 */
export const generateTokens = (payload: IndustryTokenPayload) => {
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
export const verifyRefreshToken = (token: string): IndustryTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as IndustryTokenPayload;
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): IndustryTokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as IndustryTokenPayload;
};

/**
 * Service: Register Industry Partner & SPOC
 */
export const registerIndustry = async (data: RegisterIndustryDTO) => {
  const corporateEmail = data.spoc.email.toLowerCase().trim();

  // 1. Check for duplicate SPOC Email
  const existingSpoc = await db
    .select({ id: industrySpoc.id })
    .from(industrySpoc)
    .where(eq(industrySpoc.email, corporateEmail))
    .limit(1);

  if (existingSpoc.length > 0) {
    const error = new Error(`Corporate email '${corporateEmail}' is already registered.`);
    (error as any).statusCode = 409;
    throw error;
  }

  // 2. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.spoc.password, salt);

  // 3. Generate IDs
  const industryId = `ind_${crypto.randomUUID()}`;
  const spocId = `ind_spoc_${crypto.randomUUID()}`;

  // 4. Atomic Insertion in Transaction
  return await db.transaction(async (tx) => {
    // Insert Industry Partner
    const [newPartner] = await tx
      .insert(industryPartners)
      .values({
        id: industryId,
        name: data.name.trim(),
        type: data.type,
        sectorTags: data.sectorTags,
        contributionTypes: data.contributionTypes,
        operatingDistricts: data.operatingDistricts || [],
        location: data.location || "",
        contactDetails: data.contactDetails || {},
        isActive: true,
      })
      .returning();

    // Insert Industry SPOC
    const [newSpoc] = await tx
      .insert(industrySpoc)
      .values({
        id: spocId,
        industryId: industryId,
        firstname: data.spoc.firstname.trim(),
        lastname: data.spoc.lastname.trim(),
        email: corporateEmail,
        passwordHash,
        designation: data.spoc.designation || "SPOC",
        phone: data.spoc.phone || "",
      })
      .returning();

    // Generate JWT Tokens
    const { accessToken, refreshToken } = generateTokens({
      spocID: newSpoc.id,
      industryID: newPartner.id,
      email: newSpoc.email,
      role: "INDUSTRY_SPOC",
    });

    // Save refresh token
    await tx
      .update(industrySpoc)
      .set({ refreshToken, updatedAt: new Date() })
      .where(eq(industrySpoc.id, newSpoc.id));

    return {
      partner: {
        id: newPartner.id,
        name: newPartner.name,
        type: newPartner.type,
        sectorTags: newPartner.sectorTags,
        contributionTypes: newPartner.contributionTypes,
        operatingDistricts: newPartner.operatingDistricts,
        location: newPartner.location,
        contactDetails: newPartner.contactDetails,
        isActive: newPartner.isActive,
      },
      spoc: {
        id: newSpoc.id,
        firstname: newSpoc.firstname,
        lastname: newSpoc.lastname,
        email: newSpoc.email,
        designation: newSpoc.designation,
        phone: newSpoc.phone,
      },
      accessToken,
      refreshToken,
    };
  });
};

/**
 * Service: Login Industry SPOC
 */
export const loginIndustry = async (data: LoginIndustryDTO) => {
  const corporateEmail = data.email.toLowerCase().trim();

  // 1. Find SPOC by email
  const spocRecords = await db
    .select()
    .from(industrySpoc)
    .where(eq(industrySpoc.email, corporateEmail))
    .limit(1);

  if (spocRecords.length === 0) {
    const error = new Error("Invalid email or password.");
    (error as any).statusCode = 401;
    throw error;
  }

  const currentSpoc = spocRecords[0];

  // 2. Validate Password
  const isMatch = await bcrypt.compare(data.password, currentSpoc.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid email or password.");
    (error as any).statusCode = 401;
    throw error;
  }

  // 3. Fetch associated Industry Partner
  const partnerRecords = await db
    .select()
    .from(industryPartners)
    .where(eq(industryPartners.id, currentSpoc.industryId))
    .limit(1);

  if (partnerRecords.length === 0) {
    const error = new Error("Associated industry partner record not found.");
    (error as any).statusCode = 404;
    throw error;
  }

  const partner = partnerRecords[0];

  if (!partner.isActive) {
    const error = new Error("This industry partner account is currently deactivated.");
    (error as any).statusCode = 403;
    throw error;
  }

  // 4. Generate Tokens
  const { accessToken, refreshToken } = generateTokens({
    spocID: currentSpoc.id,
    industryID: partner.id,
    email: currentSpoc.email,
    role: "INDUSTRY_SPOC",
  });

  // 5. Rotate Refresh Token in DB
  await db
    .update(industrySpoc)
    .set({ refreshToken, updatedAt: new Date() })
    .where(eq(industrySpoc.id, currentSpoc.id));

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      type: partner.type,
      sectorTags: partner.sectorTags,
      contributionTypes: partner.contributionTypes,
      operatingDistricts: partner.operatingDistricts,
      location: partner.location,
      contactDetails: partner.contactDetails,
      isActive: partner.isActive,
    },
    spoc: {
      id: currentSpoc.id,
      firstname: currentSpoc.firstname,
      lastname: currentSpoc.lastname,
      email: currentSpoc.email,
      designation: currentSpoc.designation,
      phone: currentSpoc.phone,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Service: Refresh Industry Session
 */
export const refreshIndustrySession = async (token: string) => {
  let payload: IndustryTokenPayload;

  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    const error = new Error("Invalid or expired refresh token.");
    (error as any).statusCode = 401;
    throw error;
  }

  // Check if token matches DB
  const spocRecords = await db
    .select()
    .from(industrySpoc)
    .where(eq(industrySpoc.id, payload.spocID))
    .limit(1);

  if (spocRecords.length === 0 || spocRecords[0].refreshToken !== token) {
    const error = new Error("Refresh token revoked or invalid.");
    (error as any).statusCode = 401;
    throw error;
  }

  const currentSpoc = spocRecords[0];

  // Generate new Access Token
  const accessToken = jwt.sign(
    {
      spocID: currentSpoc.id,
      industryID: currentSpoc.industryId,
      email: currentSpoc.email,
      role: "INDUSTRY_SPOC",
    },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions
  );

  return {
    accessToken,
    spoc: {
      id: currentSpoc.id,
      firstname: currentSpoc.firstname,
      lastname: currentSpoc.lastname,
      email: currentSpoc.email,
      designation: currentSpoc.designation,
    },
  };
};

/**
 * Service: Logout Industry SPOC
 */
export const logoutIndustry = async (spocId: string) => {
  await db
    .update(industrySpoc)
    .set({ refreshToken: null, updatedAt: new Date() })
    .where(eq(industrySpoc.id, spocId));
};

/**
 * Service: Get Industry Profile
 */
export const getIndustryProfile = async (spocId: string) => {
  const spocRecords = await db
    .select()
    .from(industrySpoc)
    .where(eq(industrySpoc.id, spocId))
    .limit(1);

  if (spocRecords.length === 0) {
    const error = new Error("SPOC not found.");
    (error as any).statusCode = 404;
    throw error;
  }

  const currentSpoc = spocRecords[0];

  const partnerRecords = await db
    .select()
    .from(industryPartners)
    .where(eq(industryPartners.id, currentSpoc.industryId))
    .limit(1);

  if (partnerRecords.length === 0) {
    const error = new Error("Industry partner record not found.");
    (error as any).statusCode = 404;
    throw error;
  }

  const partner = partnerRecords[0];

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      type: partner.type,
      sectorTags: partner.sectorTags,
      contributionTypes: partner.contributionTypes,
      operatingDistricts: partner.operatingDistricts,
      location: partner.location,
      contactDetails: partner.contactDetails,
      isActive: partner.isActive,
    },
    spoc: {
      id: currentSpoc.id,
      firstname: currentSpoc.firstname,
      lastname: currentSpoc.lastname,
      email: currentSpoc.email,
      designation: currentSpoc.designation,
      phone: currentSpoc.phone,
    },
  };
};

export interface HeActiveProjectsQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

/**
 * Service: Fetch Higher Education Active & Claimed Projects for Industry Collaboration
 */
export const getHigherEducationActiveProjects = async (
  options: HeActiveProjectsQueryOptions = {}
) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 6));
  const offset = (page - 1) * limit;

  // Base conditions: problem statement must be claimed by a Higher Education institution
  const baseConditions = [
    isNotNull(problemStatements.claimedByUniversityId),
    ne(problemStatements.status, "rejected"),
  ];

  if (options.category && options.category.trim() !== "") {
    baseConditions.push(eq(problemStatements.category, options.category.trim()));
  }

  if (options.search && options.search.trim() !== "") {
    const term = `%${options.search.trim()}%`;
    baseConditions.push(
      or(
        ilike(problemStatements.title, term),
        ilike(problemStatements.statementText, term),
        ilike(university.universityName, term)
      )!
    );
  }

  const whereClause = and(...baseConditions);

  // Total count
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(problemStatements)
    .innerJoin(
      university,
      eq(problemStatements.claimedByUniversityId, university.universityID)
    )
    .where(whereClause);

  const total = countRes?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Query active projects with institution & SPOC relations
  const items = await db
    .select({
      id: problemStatements.id,
      title: problemStatements.title,
      statementText: problemStatements.statementText,
      category: problemStatements.category,
      status: problemStatements.status,
      confidence: problemStatements.confidence,
      evidenceCount: problemStatements.evidenceCount,
      affectedArea: problemStatements.affectedArea,
      solutionDomain: problemStatements.solutionDomain,
      targetInstitutionType: problemStatements.targetInstitutionType,
      track: problemStatements.track,
      urgentEscalation: problemStatements.urgentEscalation,
      claimedAt: problemStatements.claimedAt,
      createdAt: problemStatements.createdAt,
      updatedAt: problemStatements.updatedAt,
      university: {
        universityID: university.universityID,
        universityName: university.universityName,
        AISHECode: university.AISHECode,
        universityAddress: university.universityAddress,
        universityContactNo: university.universityContactNo,
        universityWebsiteLink: university.universityWebsiteLink,
        universityResearchDepartments: university.universityResearchDepartments,
      },
      spoc: {
        spocID: universitySpoc.spocID,
        firstname: universitySpoc.firstname,
        lastname: universitySpoc.lastname,
        universityEmail: universitySpoc.universityEmail,
        positionTitle: universitySpoc.positionTitle,
        departmentSpoc: universitySpoc.departmentSpoc,
      },
    })
    .from(problemStatements)
    .innerJoin(
      university,
      eq(problemStatements.claimedByUniversityId, university.universityID)
    )
    .leftJoin(
      universitySpoc,
      eq(problemStatements.claimedBySpocId, universitySpoc.spocID)
    )
    .where(whereClause)
    .orderBy(desc(problemStatements.claimedAt), desc(problemStatements.createdAt))
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

export interface CreateProposalDTO {
  problemStatementId: string;
  proposalTitle: string;
  proposalSummary: string;
  contributionType?: string;
  estimatedTimeline?: string;
}

/**
 * Service: Create Industry Solution Proposal with Cloudinary Document Upload
 */
export const createIndustryProposal = async (
  industryId: string,
  industrySpocId: string,
  data: CreateProposalDTO,
  file?: Express.Multer.File
) => {
  if (!data.problemStatementId) {
    const error = new Error("Problem statement ID is required");
    (error as any).statusCode = 400;
    throw error;
  }

  if (!data.proposalTitle || !data.proposalTitle.trim()) {
    const error = new Error("Proposal title is required");
    (error as any).statusCode = 400;
    throw error;
  }

  if (!data.proposalSummary || !data.proposalSummary.trim()) {
    const error = new Error("Proposal summary is required");
    (error as any).statusCode = 400;
    throw error;
  }

  if (!file || !file.buffer) {
    const error = new Error("A proposal document (PDF or DOC) is required");
    (error as any).statusCode = 400;
    throw error;
  }

  // Find problem statement to verify and get claimed university ID
  const [ps] = await db
    .select({
      id: problemStatements.id,
      claimedByUniversityId: problemStatements.claimedByUniversityId,
      status: problemStatements.status,
    })
    .from(problemStatements)
    .where(eq(problemStatements.id, data.problemStatementId))
    .limit(1);

  if (!ps) {
    const error = new Error("Problem statement not found");
    (error as any).statusCode = 404;
    throw error;
  }

  if (!ps.claimedByUniversityId) {
    const error = new Error(
      "This problem statement has not yet been claimed by any Higher Education institution"
    );
    (error as any).statusCode = 400;
    throw error;
  }

  // Upload document to Cloudinary
  const uploadRes = await uploadBufferToCloudinary(
    file.buffer,
    "civic_resolve/proposals",
    "auto"
  );

  const [newProposal] = await db
    .insert(industryProposals)
    .values({
      problemStatementId: data.problemStatementId,
      universityId: ps.claimedByUniversityId,
      industryId,
      industrySpocId,
      proposalTitle: data.proposalTitle.trim(),
      proposalSummary: data.proposalSummary.trim(),
      contributionType: data.contributionType || "CSR_GRANT",
      estimatedTimeline: data.estimatedTimeline?.trim() || null,
      documentUrl: uploadRes.url,
      documentPublicId: uploadRes.publicId,
      documentName: file.originalname || "proposal_document.pdf",
      documentFormat: uploadRes.format || file.mimetype.split("/")[1] || "pdf",
      status: "pending",
    })
    .returning();

  return newProposal;
};

/**
 * Service: Fetch Proposals submitted by logged-in Industry Partner
 */
export const getIndustryProposals = async (industryId: string) => {
  const proposals = await db
    .select({
      id: industryProposals.id,
      proposalTitle: industryProposals.proposalTitle,
      proposalSummary: industryProposals.proposalSummary,
      contributionType: industryProposals.contributionType,
      estimatedTimeline: industryProposals.estimatedTimeline,
      documentUrl: industryProposals.documentUrl,
      documentName: industryProposals.documentName,
      status: industryProposals.status,
      collegeFeedback: industryProposals.collegeFeedback,
      reviewedAt: industryProposals.reviewedAt,
      createdAt: industryProposals.createdAt,
      problemStatement: {
        id: problemStatements.id,
        title: problemStatements.title,
        category: problemStatements.category,
      },
      university: {
        universityID: university.universityID,
        universityName: university.universityName,
        AISHECode: university.AISHECode,
      },
    })
    .from(industryProposals)
    .innerJoin(
      problemStatements,
      eq(industryProposals.problemStatementId, problemStatements.id)
    )
    .innerJoin(
      university,
      eq(industryProposals.universityId, university.universityID)
    )
    .where(eq(industryProposals.industryId, industryId))
    .orderBy(desc(industryProposals.createdAt));

  return proposals;
};
