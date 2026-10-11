-- ============================================================
-- CivicResolve Agent Pipeline — Patch Migration v2
-- Apply AFTER agent_migration.sql
-- Fixes: B2, H3, H8, M2, M4, M5, M10
-- ============================================================

-- FIX H8/M1/M9/M10: Add run_id, prompt_version, scores to agent_runs for end-to-end tracing
ALTER TABLE agent_runs
  ADD COLUMN IF NOT EXISTS run_id TEXT,
  ADD COLUMN IF NOT EXISTS gate2_decision TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS research_scores TEXT,
  ADD COLUMN IF NOT EXISTS industry_scores TEXT,
  ADD COLUMN IF NOT EXISTS run_logs TEXT;
CREATE INDEX IF NOT EXISTS agent_runs_run_id_idx ON agent_runs(run_id);

-- FIX M5: Idempotency guard — one final persist row per (issue_id, run_id)
CREATE UNIQUE INDEX IF NOT EXISTS agent_runs_issue_run_unique
  ON agent_runs(issue_id, run_id)
  WHERE run_id IS NOT NULL;

-- FIX M2, H3: Add track and urgent_escalation to problem_statements
ALTER TABLE problem_statements
  ADD COLUMN IF NOT EXISTS track TEXT,             -- RESEARCH | INDUSTRY | HYBRID
  ADD COLUMN IF NOT EXISTS urgent_escalation BOOLEAN DEFAULT FALSE;

-- FIX M4: Add missing metadata columns to issue_embeddings
ALTER TABLE issue_embeddings
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS issue_status TEXT,
  ADD COLUMN IF NOT EXISTS created_at_ts TIMESTAMP;

-- FIX H5: WATCHLIST re-evaluation helper view
-- Join issue_embeddings with MongoDB-mirrored agent status.
-- Note: this view is only useful if you mirror agent_status to Postgres.
-- Until then, the retrieveNode uses a graceful-fallback query.
-- Placeholder for future mirror table:
CREATE TABLE IF NOT EXISTS issues_agent_status (
  issue_id   TEXT PRIMARY KEY,
  agent_status TEXT NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ias_status_idx ON issues_agent_status(agent_status);
