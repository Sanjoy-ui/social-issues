-- ============================================================
-- CivicResolve Problem Statement Claiming System Migration
-- Adds columns for single-institution research claims
-- ============================================================

ALTER TABLE problem_statements
  ADD COLUMN IF NOT EXISTS track TEXT,
  ADD COLUMN IF NOT EXISTS urgent_escalation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS claimed_by_university_id VARCHAR(255) REFERENCES university("universityID"),
  ADD COLUMN IF NOT EXISTS claimed_by_spoc_id VARCHAR(255) REFERENCES university_spoc("spocID"),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_ps_claimed_univ ON problem_statements(claimed_by_university_id);
