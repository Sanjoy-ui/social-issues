import { pool } from "../../config/db.js";
import { Issue } from "../../models/issue.js";
import { generateEmbedding } from "../client/llm.client.js";
import { agentConfig } from "../config/agent.config.js";
import type {
  AgentState,
  CandidateMatch,
  PatternMetrics,
  PsMatch,
  RetrievalContext,
} from "../graph/state.js";

const KM_PER_DEGREE = 111.0; // rough average for lat/lng → km conversion

/**
 * Compute geographic spread in km across a set of lat/lng points.
 * Returns 0 if fewer than 2 points have coordinates.
 */
function computeGeographicSpreadKm(issues: CandidateMatch[]): number {
  const points = issues.filter((i) => i.geoLat != null && i.geoLng != null);
  if (points.length < 2) return 0;
  let maxDist = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dlat = (points[i].geoLat! - points[j].geoLat!) * KM_PER_DEGREE;
      const dlng = (points[i].geoLng! - points[j].geoLng!) * KM_PER_DEGREE;
      maxDist = Math.max(maxDist, Math.sqrt(dlat * dlat + dlng * dlng));
    }
  }
  return parseFloat(maxDist.toFixed(2));
}

/**
 * Compute time span in years across issue createdAt dates.
 */
function computeTimeSpanYears(issues: CandidateMatch[]): number {
  const dates = issues
    .map((i) => i.createdAt?.getTime())
    .filter(Boolean) as number[];
  if (dates.length < 2) return 0;
  const spanMs = Math.max(...dates) - Math.min(...dates);
  return parseFloat((spanMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));
}

/**
 * Compute escalation trend: compare report count in last-30-days vs prior-30-days.
 */
function computeEscalationTrend(
  issues: CandidateMatch[]
): PatternMetrics["escalationTrend"] {
  const now = Date.now();
  const cutNew = now - 30 * 24 * 60 * 60 * 1000;
  const cutOld = now - 60 * 24 * 60 * 60 * 1000;
  const recentCount = issues.filter(
    (i) => i.createdAt && i.createdAt.getTime() >= cutNew
  ).length;
  const priorCount = issues.filter(
    (i) =>
      i.createdAt &&
      i.createdAt.getTime() >= cutOld &&
      i.createdAt.getTime() < cutNew
  ).length;
  if (recentCount > priorCount) return "rising";
  if (recentCount < priorCount) return "declining";
  if (recentCount === 0 && priorCount === 0) return "unknown";
  return "stable";
}

/**
 * Node 3: Retrieve Candidates
 * - Fetches or generates vector embedding for the target issue
 * - Queries issue_embeddings using cosine similarity (<=> operator)
 * - Applies geo bounding-box filter (±0.5° lat/lng) when coordinates exist, with fallback
 * - Queries ps_embeddings to find potential matches to existing Problem Statements
 * - FIX H5: Queries for WATCHLIST (unassigned) issues that are similar to current issue
 * - FIX M3: Computes PatternMetrics (recurrenceCount, timeSpanYears, geographicSpreadKm,
 *           escalationTrend, repeatedUnresolved)
 */
export async function retrieveNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const issueId = state.issueId;
  const runId = state.runId;

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

    // 2. Query similar issues (Geo Bounding-box ±0.5° ~ 55km)
    let similarIssues: CandidateMatch[] = [];

    if (geoLat !== null && geoLng !== null && !isNaN(geoLat) && !isNaN(geoLng)) {
      const minLat = geoLat - 0.5;
      const maxLat = geoLat + 0.5;
      const minLng = geoLng - 0.5;
      const maxLng = geoLng + 0.5;

      const geoRes = await pool.query(
        `
        SELECT
          ie.issue_id,
          ie.category,
          ie.geo_lat,
          ie.geo_lng,
          ie.created_at,
          ie.issue_status,
          1 - (ie.embedding <=> $1::vector) AS similarity
        FROM issue_embeddings ie
        WHERE ie.issue_id != $2
          AND ie.geo_lat BETWEEN $3 AND $4
          AND ie.geo_lng BETWEEN $5 AND $6
        ORDER BY ie.embedding <=> $1::vector ASC
        LIMIT 10
        `,
        [vectorStr, issueId, minLat, maxLat, minLng, maxLng]
      );

      similarIssues = geoRes.rows.map((row) => ({
        issueId: row.issue_id,
        category: row.category,
        geoLat: row.geo_lat,
        geoLng: row.geo_lng,
        createdAt: row.created_at ? new Date(row.created_at) : null,
        status: row.issue_status,
        similarity: parseFloat(row.similarity),
      }));
    }

    // If no geo filter applied or geo cluster has < 3 issues, run global semantic search
    if (similarIssues.length < 3) {
      const globalRes = await pool.query(
        `
        SELECT
          ie.issue_id,
          ie.category,
          ie.geo_lat,
          ie.geo_lng,
          ie.created_at,
          ie.issue_status,
          1 - (ie.embedding <=> $1::vector) AS similarity
        FROM issue_embeddings ie
        WHERE ie.issue_id != $2
        ORDER BY ie.embedding <=> $1::vector ASC
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
            createdAt: row.created_at ? new Date(row.created_at) : null,
            status: row.issue_status,
            similarity: parseFloat(row.similarity),
          });
        }
      }
    }

    // 3. Query ps_embeddings for existing Problem Statements
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

    // 4. FIX H5: WATCHLIST re-evaluation — find unassigned issues that are
    //    semantically similar to the current issue. These will be pulled into
    //    Gate 2's cluster count, enabling WATCHLIST→PASS transitions.
    const watchlistMatches: CandidateMatch[] = [];
    if (agentConfig.gate2.watchlistEnabled) {
      const watchlistRes = await pool.query(
        `
        SELECT
          ie.issue_id,
          ie.category,
          ie.geo_lat,
          ie.geo_lng,
          ie.created_at,
          ie.issue_status,
          1 - (ie.embedding <=> $1::vector) AS similarity
        FROM issue_embeddings ie
        JOIN issues_agent_status ias ON ias.issue_id = ie.issue_id
        WHERE ie.issue_id != $2
          AND ias.agent_status = 'unassigned'
          AND 1 - (ie.embedding <=> $1::vector) >= $3
        ORDER BY ie.embedding <=> $1::vector ASC
        LIMIT 20
        `,
        [vectorStr, issueId, agentConfig.gate2.clusterSimilarityThreshold]
      ).catch(() => ({ rows: [] })); // graceful: if join fails, skip watchlist

      for (const row of watchlistRes.rows) {
        watchlistMatches.push({
          issueId: row.issue_id,
          category: row.category,
          geoLat: row.geo_lat,
          geoLng: row.geo_lng,
          createdAt: row.created_at ? new Date(row.created_at) : null,
          status: row.issue_status,
          similarity: parseFloat(row.similarity),
        });
      }
    }

    // 5. FIX M3: Compute PatternMetrics across all cluster candidates
    const allCandidates = [...similarIssues, ...watchlistMatches];
    const repeatedUnresolved = allCandidates.filter(
      (c) => c.status && !["RESOLVED", "REJECTED"].includes(c.status)
    ).length;

    const patternMetrics = {
      recurrenceCount: allCandidates.length,
      timeSpanYears: computeTimeSpanYears(allCandidates),
      geographicSpreadKm: computeGeographicSpreadKm(allCandidates),
      escalationTrend: computeEscalationTrend(allCandidates),
      repeatedUnresolved,
    };

    const retrievalContext: RetrievalContext = {
      similarIssues,
      matchedProblemStatements,
      watchlistMatches,
      patternMetrics,
    };

    const topPs = matchedProblemStatements[0];
    const topIssue = similarIssues[0];

    return {
      retrieval: retrievalContext,
      logs: [
        `[${runId}][RetrieveNode] Found ${similarIssues.length} candidate issues (top sim: ${
          topIssue ? topIssue.similarity.toFixed(3) : "none"
        }), ${watchlistMatches.length} WATCHLIST matches, ${matchedProblemStatements.length} existing PSs (top sim: ${
          topPs ? topPs.similarity.toFixed(3) : "none"
        }). Pattern: recurrence=${patternMetrics.recurrenceCount}, span=${patternMetrics.timeSpanYears}yr, spread=${patternMetrics.geographicSpreadKm}km, trend=${patternMetrics.escalationTrend}`,
      ],
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`❌ [RetrieveNode] Error during candidate retrieval for ${issueId}:`, errorMsg);

    return {
      retrieval: {
        similarIssues: [],
        matchedProblemStatements: [],
        watchlistMatches: [],
        patternMetrics: {
          recurrenceCount: 0,
          timeSpanYears: 0,
          geographicSpreadKm: 0,
          escalationTrend: "unknown",
          repeatedUnresolved: 0,
        },
      },
      logs: [`[${runId}][RetrieveNode] Warning: Candidate retrieval error: ${errorMsg}`],
    };
  }
}
