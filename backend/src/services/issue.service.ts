import crypto from "crypto";
import { Issue, type IIssue } from "../models/issue.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.util.js";
import type { CreateIssueDTO } from "../dto/issue.dto.js";

export interface ReporterContext {
  citizenId?: string;
  fullName?: string;
  email?: string;
}

/**
 * Service: Register a new civic issue in MongoDB and upload media proofs to Cloudinary
 */
export const registerIssue = async (
  data: CreateIssueDTO,
  files: Express.Multer.File[] = [],
  reporter?: ReporterContext
): Promise<IIssue> => {
  // 1. Upload proof files to Cloudinary if attached
  let issueProofUrls: string[] = [];

  if (files && files.length > 0) {
    try {
      const uploadPromises = files.map((file) =>
        uploadBufferToCloudinary(file.buffer, "civic_resolve/issues")
      );
      const results = await Promise.all(uploadPromises);
      issueProofUrls = results.map((res) => res.url);
    } catch (uploadError) {
      console.error("Failed to upload proof files to Cloudinary:", uploadError);
      const error = new Error("Failed to upload attachment files. Please try again.");
      (error as any).statusCode = 502;
      throw error;
    }
  }

  // 2. Generate unique tracking issue ID
  const issueId = `ISSUE-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  // 3. Resolve user details and handle anonymity
  const isAnonymous = Boolean(data.annonymous);
  const username = isAnonymous
    ? "Anonymous Citizen"
    : reporter?.fullName || "Citizen Reporter";
  const email = isAnonymous ? null : reporter?.email || null;
  const citizenId = reporter?.citizenId || null;

  // 4. Create and save Mongoose Issue document in MongoDB
  const newIssue = new Issue({
    id: issueId,
    username,
    email,
    citizen_id: citizenId,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    address: data.address || null,
    issue_title: data.issue_title.trim(),
    issue_description: data.issue_description.trim(),
    issue_proof: issueProofUrls,
    annonymous: isAnonymous,
    issue_fk: data.issue_fk || null,
    status: "SUBMITTED",
  });

  await newIssue.save();

  return newIssue;
};

/**
 * Service: Get issues submitted by a specific citizen
 */
export const getCitizenIssues = async (citizenId: string): Promise<IIssue[]> => {
  return Issue.find({ citizen_id: citizenId }).sort({ createdAt: -1 });
};

/**
 * Service: Get single issue by custom ID
 */
export const getIssueById = async (issueId: string): Promise<IIssue | null> => {
  return Issue.findOne({ id: issueId });
};
