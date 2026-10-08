import {
  pgTable,
  uuid,
  text,
  real,
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
 * Task 2: issue_embeddings
 * Stores pgvector embeddings for each civic issue (1024-dim NVIDIA NIM)
 */
export const issueEmbeddings = pgTable("issue_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: text("issue_id").notNull().unique(),   // FK → MongoDB issue.id
  embedding: vector("embedding"),
  category: text("category"),
  geoLat: real("geo_lat"),
  geoLng: real("geo_lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type IssueEmbedding = typeof issueEmbeddings.$inferSelect;
export type NewIssueEmbedding = typeof issueEmbeddings.$inferInsert;
