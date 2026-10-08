-- ============================================================
-- CivicResolve Agent Pipeline — Postgres Migrations
-- Run this SQL in Supabase SQL Editor BEFORE running drizzle migrate
-- ============================================================

-- Task 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Task 2: issue_embeddings
CREATE TABLE IF NOT EXISTS issue_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT NOT NULL UNIQUE,
  embedding vector(1024),
  category TEXT,
  geo_lat FLOAT,
  geo_lng FLOAT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS issue_embeddings_vector_idx
  ON issue_embeddings USING hnsw (embedding vector_cosine_ops);

-- Task 3: problem_statements
CREATE TABLE IF NOT EXISTS problem_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  statement_text TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  confidence FLOAT,
  evidence_count INT NOT NULL DEFAULT 0,
  affected_area TEXT,
  solution_domain TEXT,
  target_institution_type TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Task 4: ps_embeddings
CREATE TABLE IF NOT EXISTS ps_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ps_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
  embedding vector(1024),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ps_embeddings_vector_idx
  ON ps_embeddings USING hnsw (embedding vector_cosine_ops);

-- Task 5: ps_issue_links
CREATE TABLE IF NOT EXISTS ps_issue_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ps_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL,
  similarity_score FLOAT,
  linked_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ps_issue_links_ps_id_idx ON ps_issue_links(ps_id);
CREATE INDEX IF NOT EXISTS ps_issue_links_issue_id_idx ON ps_issue_links(issue_id);

-- Task 6: agent_runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT,
  ps_id UUID,
  gate1_result BOOLEAN,
  gate1_reasoning TEXT,
  gate2_case TEXT,
  reasoning_summary TEXT,
  model_used TEXT,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_runs_issue_id_idx ON agent_runs(issue_id);
