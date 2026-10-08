import { pool } from "../../config/db.js";
import { Issue } from "../../models/issue.js";
import { generateEmbedding } from "../client/llm.client.js";
import type {
  AgentState,
  CandidateMatch,
  PsMatch,
  RetrievalContext,
} from "../graph/state.js";

/**
 * Node 3: Retrieve Candidates
 * - Fetches or generates vector embedding for the target issue
 * - Queries issue_embeddings using cosine similarity (<=> operator)
 * - Applies geo bounding-box filter (±0.5° lat/lng) when coordinates exist, with fallback
 * - Queries ps_embeddings to find potential matches to existing Problem Statements
 */
export async function retrieveNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;

  try {
    // 1. Fetch current issue embedding and coordinates from Postgres
    const embedRes = await pool.query(
      `SELECT embedding, geo_lat, geo_lng, category FROM issue_embeddings WHERE issue_id = $1`,
      [issueId]
    );

    let vectorStr: string;
    let geoLat: number | null = null;
    let geoLng: number | null = null;

    if (embedRes.rows.length > 0 && embedRes.rows[0].embedding) {
      vectorStr = embedRes.rows[0].embedding;
      geoLat = embedRes.rows[0].geo_lat ?? null;
      geoLng = embedRes.rows[0].geo_lng ?? null;
    } else {
      // Fallback: Generate embedding on the fly if not yet recorded
      const title = state.issue?.title || "";
      const description = state.issue?.description || "";
      const embeddingArray = await generateEmbedding(
        `Title: ${title}\nDescription: ${description}`,
        "passage"
      );
      vectorStr = `[${embeddingArray.join(",")}]`;

      if (state.issue?.latitude && state.issue?.longitude) {
        geoLat = parseFloat(state.issue.latitude);
        geoLng = parseFloat(state.issue.longitude);
      }
    }

    // 2. Query similar issues (Task 22 + Task 23: Geo Bounding-box ±0.5° ~ 55km)
    let similarIssues: CandidateMatch[] = [];

    if (geoLat !== null && geoLng !== null && !isNaN(geoLat) && !isNaN(geoLng)) {
      const minLat = geoLat - 0.5;
      const maxLat = geoLat + 0.5;
      const minLng = geoLng - 0.5;
      const maxLng = geoLng + 0.5;

      const geoRes = await pool.query(
        `
        SELECT
          issue_id,
          category,
          geo_lat,
          geo_lng,
          1 - (embedding <=> $1::vector) AS similarity
        FROM issue_embeddings
        WHERE issue_id != $2
          AND geo_lat BETWEEN $3 AND $4
          AND geo_lng BETWEEN $5 AND $6
        ORDER BY embedding <=> $1::vector ASC
        LIMIT 10
        `,
        [vectorStr, issueId, minLat, maxLat, minLng, maxLng]
      );

      similarIssues = geoRes.rows.map((row) => ({
        issueId: row.issue_id,
        category: row.category,
        geoLat: row.geo_lat,
        geoLng: row.geo_lng,
        similarity: parseFloat(row.similarity),
      }));
    }

    // If no geo filter applied or geo cluster has < 3 issues, run global semantic search
    if (similarIssues.length < 3) {
      const globalRes = await pool.query(
        `
        SELECT
          issue_id,
          category,
          geo_lat,
          geo_lng,
          1 - (embedding <=> $1::vector) AS similarity
        FROM issue_embeddings
        WHERE issue_id != $2
        ORDER BY embedding <=> $1::vector ASC
        LIMIT 10
        `,
        [vectorStr, issueId]
      );

      const existingIds = new Set(similarIssues.map((s) => s.issueId));
      for (const row of globalRes.rows) {
        if (!existingIds.has(row.issue_id)) {
          similarIssues.push({
            issueId: row.issue_id,
            category: row.category,
            geoLat: row.geo_lat,
            geoLng: row.geo_lng,
            similarity: parseFloat(row.similarity),
          });
        }
      }
    }

    // 3. Query ps_embeddings for existing Problem Statements (Task 24)
    const psRes = await pool.query(
      `
      SELECT
        ps.id AS ps_id,
        ps.title,
        ps.status,
        1 - (pse.embedding <=> $1::vector) AS similarity
      FROM ps_embeddings pse
      JOIN problem_statements ps ON ps.id = pse.ps_id
      WHERE ps.status != 'rejected'
      ORDER BY pse.embedding <=> $1::vector ASC
      LIMIT 5
      `,
      [vectorStr]
    );

    const matchedProblemStatements: PsMatch[] = psRes.rows.map((row) => ({
      psId: row.ps_id,
      title: row.title,
      status: row.status,
      similarity: parseFloat(row.similarity),
    }));

    const retrievalContext: RetrievalContext = {
      similarIssues,
      matchedProblemStatements,
    };

    const topPs = matchedProblemStatements[0];
    const topIssue = similarIssues[0];

    return {
      retrieval: retrievalContext,
      logs: [
        `[RetrieveNode] Found ${similarIssues.length} candidate issues (top similarity: ${
          topIssue ? topIssue.similarity.toFixed(3) : "none"
        }) and ${matchedProblemStatements.length} existing PSs (top similarity: ${
          topPs ? topPs.similarity.toFixed(3) : "none"
        })`,
      ],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [RetrieveNode] Error during candidate retrieval for ${issueId}:`, errorMsg);

    return {
      retrieval: {
        similarIssues: [],
        matchedProblemStatements: [],
      },
      logs: [`[RetrieveNode] Warning: Candidate retrieval encountered error: ${errorMsg}`],
    };
  }
}
