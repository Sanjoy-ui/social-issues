import { db } from "../../config/db.js";
import { issueEmbeddings } from "../../models/issueEmbedding.js";
import { Issue } from "../../models/issue.js";
import { generateEmbedding } from "../client/llm.client.js";
import { stripPii } from "../../utils/pii.js";
import type { AgentState, IssueContext } from "../graph/state.js";

/**
 * Node 1: Ingest Issue
 * - Fetches issue details from MongoDB by issueId
 * - Updates issue agent_status to 'processing'
 * - FIX H1: Strips PII from text BEFORE embedding
 * - Generates dense vector embedding (1024-dim) via NVIDIA NIM
 * - Upserts embedding and geo metadata into Postgres issue_embeddings table
 * - Updates MongoDB issue embedding_generated = true
 */
export async function ingestNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const runId = state.runId;

  if (!issueId) {
    return {
      status: "failed",
      error: "[IngestNode] Missing issueId in state",
      logs: [`[${runId}][IngestNode] Error: No issueId provided`],
    };
  }

  try {
    // 1. Fetch issue from MongoDB
    const issueDoc = await Issue.findOne({ id: issueId });
    if (!issueDoc) {
      return {
        status: "failed",
        error: `[IngestNode] Issue not found in MongoDB with id: ${issueId}`,
        logs: [`[${runId}][IngestNode] Error: Issue ${issueId} not found in database`],
      };
    }

    const title = issueDoc.issue_title || "";
    const description = issueDoc.issue_description || "";
    const address = issueDoc.address || "";
    const latStr = issueDoc.latitude || null;
    const lngStr = issueDoc.longitude || null;

    const geoLat = latStr ? parseFloat(latStr) : null;
    const geoLng = lngStr ? parseFloat(lngStr) : null;

    // FIX H1: Strip PII before embedding. Do NOT include email/username/citizen_id
    // in the embedded text — those are stored only in MongoDB under access controls.
    const textToEmbed = [
      `Title: ${stripPii(title)}`,
      `Description: ${stripPii(description)}`,
      address ? `Location: ${stripPii(address)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // 2. Generate embedding via NVIDIA NIM (1024 dimensions)
    const embedding = await generateEmbedding(textToEmbed, "passage");

    // 3. Upsert into Postgres issue_embeddings table
    await db
      .insert(issueEmbeddings)
      .values({
        issueId: issueDoc.id,
        embedding,
        category: (issueDoc as any).category || null,
        geoLat: !isNaN(geoLat as number) ? geoLat : null,
        geoLng: !isNaN(geoLng as number) ? geoLng : null,
        // M4 additions
        severity: (issueDoc as any).severity_flag || (issueDoc as any).severity || null,
        issueStatus: issueDoc.status || null,
        createdAtTs: issueDoc.createdAt || new Date(),
      })
      .onConflictDoUpdate({
        target: issueEmbeddings.issueId,
        set: {
          embedding,
          geoLat: !isNaN(geoLat as number) ? geoLat : null,
          geoLng: !isNaN(geoLng as number) ? geoLng : null,
        },
      });

    // 4. Update MongoDB status
    issueDoc.agent_status = "processing";
    issueDoc.embedding_generated = true;
    await issueDoc.save();

    const issueContext: IssueContext = {
      id: issueDoc.id,
      title: issueDoc.issue_title,
      description: issueDoc.issue_description,
      latitude: issueDoc.latitude || null,
      longitude: issueDoc.longitude || null,
      proofUrls: issueDoc.issue_proof || [],
    };

    return {
      issue: issueContext,
      status: "ingested",
      logs: [
        `[${runId}][IngestNode] Issue ${issueId} fetched from MongoDB, PII stripped, generated 1024-dim embedding, and indexed in Postgres issue_embeddings`,
      ],
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`❌ [IngestNode] Failed for issue ${issueId}:`, errorMsg);

    // Attempt to mark as failed in MongoDB if possible
    try {
      await Issue.updateOne(
        { id: issueId },
        { $set: { agent_status: "failed" } }
      );
    } catch (_) {}

    // FIX M8: Log to console prominently — a dead-letter table would be the
    // production solution but we emit a structured error log here for now.
    console.error(
      `💀 [IngestNode][DEAD-LETTER] issue=${issueId} runId=${runId} error=${errorMsg}`
    );

    return {
      status: "failed",
      error: `[IngestNode] ${errorMsg}`,
      logs: [`[${runId}][IngestNode] Error processing issue ${issueId}: ${errorMsg}`],
    };
  }
}
