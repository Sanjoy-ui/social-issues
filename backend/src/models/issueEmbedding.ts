import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

// Define a custom pgvector column type (1024 dimensions for NVIDIA NIM embeddings)
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace("[", "")
      .replace("]", "")
      .split(",")
      .map(Number);
  },
});

/**
 * issue_embeddings
 * Stores pgvector embeddings for each civic issue (1024-dim NVIDIA NIM)
 * FIX M4: Added severity, issueStatus, createdAtTs columns
 */
export const issueEmbeddings = pgTable("issue_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: text("issue_id").notNull().unique(),   // FK → MongoDB issue.id
  embedding: vector("embedding"),
  category: text("category"),
  geoLat: real("geo_lat"),
  geoLng: real("geo_lng"),
  // FIX M4: additional metadata for context computation
  severity: text("severity"),
  issueStatus: text("issue_status"),
  createdAtTs: timestamp("created_at_ts"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type IssueEmbedding = typeof issueEmbeddings.$inferSelect;
export type NewIssueEmbedding = typeof issueEmbeddings.$inferInsert;
