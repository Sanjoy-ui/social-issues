import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IIssue extends Document {
  id: string;
  username?: string | null;
  email?: string | null;
  citizen_id?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  address?: string | null;
  issue_title: string;
  issue_description: string;
  issue_proof: string[];
  annonymous: boolean;
  anonymous?: boolean;
  issue_fk?: string | null;
  status: "SUBMITTED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  // Task 7 — Agent pipeline fields
  agent_status: "pending" | "processing" | "gated_out" | "unassigned" | "clustered" | "failed";
  embedding_generated: boolean;
  is_researchable: boolean | null;
  researchability_reasoning: string | null;
  solution_domain: "tech" | "policy" | "infra" | "not_applicable" | null;
  target_institution_type: "college" | "industry" | "both" | "none" | null;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema: Schema<IIssue> = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    citizen_id: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    latitude: {
      type: String,
      trim: true,
      default: null,
    },
    longitude: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    issue_title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
    },
    issue_description: {
      type: String,
      required: [true, "Issue description is required"],
      trim: true,
    },
    issue_proof: {
      type: [String],
      default: [],
    },
    annonymous: {
      type: Boolean,
      default: false,
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    issue_fk: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "SUBMITTED",
      index: true,
    },
    // ── Agent Pipeline Fields (Task 7) ───────────────────────────────────
    agent_status: {
      type: String,
      enum: ["pending", "processing", "gated_out", "unassigned", "clustered", "failed"],
      default: "pending",
      index: true,
    },
    embedding_generated: {
      type: Boolean,
      default: false,
    },
    is_researchable: {
      type: Boolean,
      default: null,
    },
    researchability_reasoning: {
      type: String,
      default: null,
    },
    solution_domain: {
      type: String,
      enum: ["tech", "policy", "infra", "not_applicable", null],
      default: null,
    },
    target_institution_type: {
      type: String,
      enum: ["college", "industry", "both", "none", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model in dev / hot-reload environments
export const Issue: Model<IIssue> =
  mongoose.models.Issue || mongoose.model<IIssue>("Issue", IssueSchema);

export default Issue;
