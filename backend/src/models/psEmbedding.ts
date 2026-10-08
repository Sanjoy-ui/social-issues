import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { problemStatements } from "./problemStatement.js";
import { vector } from "./issueEmbedding.js";

/**
 * Task 4: ps_embeddings
 * Stores pgvector embeddings for each Problem Statement for dedup + similarity matching
 */
export const psEmbeddings = pgTable("ps_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  psId: uuid("ps_id")
    .notNull()
    .references(() => problemStatements.id, { onDelete: "cascade" }),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PsEmbedding = typeof psEmbeddings.$inferSelect;
export type NewPsEmbedding = typeof psEmbeddings.$inferInsert;
