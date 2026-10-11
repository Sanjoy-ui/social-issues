# CivicResolve AI Agent — Execution Roadmap & Verification Tasks (TODO.md)

> **Document Status:** Active Execution Roadmap  
> **Source:** Converted from Phase 1 Gap Audit (`gap_report.md`) + Concurrency Queue Specification  
> **Target Subsystem:** `backend/src/ai/` (CivicResolve ProblemStatement LangGraph Subsystem)  
> **Verification Protocol:** The user reviews this roadmap and authorizes tasks one-by-one.

---

## 📌 Executive Summary & Architecture Context

The **CivicResolve ProblemStatement Agent** monitors public grievances from MongoDB and determines which issues warrant an institutional- or industry-grade **Problem Statement**, leveraging `pgvector` (PostgreSQL) as a semantic knowledge base.

### Core Spec Principles:
1. **Routine issues** (e.g. broken road, garbage pile, single streetlight) receive **NO problem statement** — only their vector embedding is stored (`VECTOR_ONLY`).
2. **Pattern-based or Severe issues** (recurrence across multiple independent reporters, multi-year history, fatal infrastructure failures) pass Gate 2 and receive a synthesized **Problem Statement** (`PASS`).
3. **Problem Statement ≠ Solution**: A problem statement articulates the systemic failure, the recurring pattern, and the root-cause gap. It **must never** prescribe a solution.
4. **Fault-Tolerant Concurrency & Queue**: When hundreds of issues are uploaded concurrently, an industrial-grade persistent queue manages them and executes them **one-by-one** (serialized with controlled concurrency), preventing LLM rate-limit thrashing, DB deadlocks, and data loss upon server restart.

---

## 🎯 Verification Protocol (How to Proceed)

```
                       ┌───────────────────────────────┐
                       │ User reviews TODO.md Roadmap  │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │ User verifies tasks & directs:│
                       │ "Do Task <ID>" (one by one)   │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │ Agent implements & executes   │
                       │ targeted fix + verification   │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │ Checkbox marked [x] in TODO.md│
                       └───────────────────────────────┘
```

---

## 📋 Comprehensive Task Checklist

### 🚀 Section Q: Concurrency, Ingestion Queue & Monitoring (Immediate Priority)

- [x] **TASK Q1: Industrial-Grade Persistent Agent Queue Service**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/services/agentQueue.service.ts`, `backend/src/ai/services/agentRunner.service.ts`
  - **Description:** Implemented `AgentQueueService` with serialized one-by-one processing (`concurrency = 1`), in-flight deduplication (`inMemorySet`), and pacing delays between LLM invocations to prevent rate-limit bursts.
  - **Verification:** Run concurrent submissions to `triggerAgentForIssue()`; verify issues are processed sequentially.

- [x] **TASK Q2: Crash Recovery & Boot Resumption**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/services/agentQueue.service.ts`, `backend/src/index.ts`
  - **Description:** On boot (`startAgentQueue()`), queries MongoDB for issues with `agent_status: "pending"` or `"processing"` (interrupted by server restart). Resets abandoned jobs and enqueues all pending items in FIFO order. Zero grievances lost on reboot.
  - **Verification:** Mark an issue as `pending` in Mongo, restart server, verify it is automatically picked up and processed.

- [x] **TASK Q3: MongoDB ChangeStream with Automatic Polling Fallback**
  - **Status:** `IMPLEMENTED` (Fulfills Spec Pipeline 1a)
  - **Files:** `backend/src/ai/services/agentQueue.service.ts`
  - **Description:** Listens in real-time to MongoDB insert operations via `Issue.watch()`. If running on standalone MongoDB without replica sets, automatically falls back to an active background polling loop every 5 seconds.
  - **Verification:** Insert an issue directly into MongoDB; verify ChangeStream or poller detects and processes it.

- [x] **TASK Q4: Exponential Backoff Retries & Dead-Letter Handling**
  - **Status:** `IMPLEMENTED` (Fulfills Spec M8)
  - **Files:** `backend/src/ai/services/agentQueue.service.ts`
  - **Description:** Transient errors (LLM timeouts, network dropouts) trigger automatic retries with exponential backoff (`delay = retryDelayMs * 2^attempt`, max 3 attempts). If retries are exhausted, transitions to `agent_status: "failed"` (Dead-Letter) and logs details without blocking the queue.
  - **Verification:** Simulate an LLM error; verify retry count increments and transitions to `failed` upon exceeding max retries.

- [x] **TASK Q5: Queue Telemetry & Operator Endpoints**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/controller/agent.controller.ts`, `backend/src/routes/agent.routes.ts`
  - **Description:** Added `GET /api/v1/agent/queue` (queue depth, active workers, DB breakdown by status) and `POST /api/v1/agent/queue/retry-failed` (manually re-enqueues failed issues).
  - **Verification:** `curl http://localhost:3000/api/v1/agent/queue` returns JSON stats.

---

### 🔴 Section B: Blockers

- [x] **TASK B1: Git Secret Scrubbing & Environment Isolation**
  - **Status:** `IMPLEMENTED`
  - **Severity:** 🔴 Blocker
  - **Files:** `backend/.env`, `backend/.gitignore`, `backend/.env.example`
  - **Description:** Verified that `backend/.env` is completely untracked by git and ignored via `backend/.gitignore`. Created clean, comprehensive `backend/.env.example` template with dummy credentials and complete configuration options.
  - **Verification:** Confirmed via `git check-ignore -v backend/.env` and `git ls-files --error-unmatch backend/.env`.

- [x] **TASK B2: Cluster Threshold Calibration (`minClusterSize >= 3`)**
  - **Status:** `IMPLEMENTED`
  - **Severity:** 🔴 Blocker
  - **Files:** `backend/src/ai/config/agent.config.ts`, `backend/src/ai/nodes/gate2Node.ts`
  - **Goal:** Fixed `minClusterSize` from `1` to `3` in `agentConfig`. Single reports no longer generate research problem statements.
  - **Verification:** Run Test 1 & Test 2 in `test_agent_spec.ts` — single pothole complaints are categorized as `VECTOR_ONLY` or `WATCHLIST`.

- [x] **TASK B3: Synthesis Fallback Hallucination Prevention**
  - **Status:** `IMPLEMENTED`
  - **Severity:** 🔴 Blocker
  - **Files:** `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** Removed the fallback code that fabricated synthetic problem statements when LLM JSON parsing failed. Instead, errors throw cleanly and trigger retry/dead-letter.
  - **Verification:** Malformed JSON from LLM aborts without inserting fake problem statements into Postgres.

---

### 🟠 Section H: High Priority

- [x] **TASK H1: PII Stripping Before Vector Embedding & LLM Prompting**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/utils/pii.ts`, `backend/src/ai/nodes/ingestNode.ts`, `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** PII regex utility scrubs emails, phone numbers, Aadhaar numbers, PAN cards, and URLs from grievance text before embedding generation and synthesis prompting.
  - **Verification:** Run Test 9 in `test_agent_spec.ts` — inputs with emails/phones have PII replaced with tokens (`[EMAIL]`, `[PHONE]`).

- [x] **TASK H2: Citizen Prompt Injection Defense**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/utils/pii.ts` (`sanitiseForPrompt`), `backend/src/ai/nodes/ingestNode.ts`, `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** Sanitizes markdown injection characters (`#`, ```` ``` ````, `[SYSTEM]`, `[INST]`) and instruction override phrases (`ignore all instructions`). Caps input at 4,000 characters.
  - **Verification:** Run Test 12 in `test_agent_spec.ts` with adversarial injection text.

- [x] **TASK H3: Critical Life-Safety Override (`urgentEscalation` Flag)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/graph/state.ts`, `backend/src/ai/nodes/gate2Node.ts`, `backend/src/ai/nodes/persistNode.ts`
  - **Goal:** Fatal/critical infrastructure issues trigger Case E bypass, set `urgentEscalation: true` in state, and broadcast via `pg_notify` channel (`urgent_escalation_events`).
  - **Verification:** Run Test 4 in `test_agent_spec.ts` — fatal bridge collapse sets `urgentEscalation = true`.

- [x] **TASK H4: Synthesis Prompt Overhaul (Gap & Persisting Root Cause Only)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/prompts/synthesize.prompt.ts`, `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** Removed all "Desired Solution & Impact" instructions from synthesis prompt. The output is strictly confined to systemic failure, pattern evidence, gap, and researchable hypotheses.
  - **Verification:** Output problem statement contains NO tool/solution recommendations.

- [x] **TASK H5: WATCHLIST (Case C) Re-evaluation on New Arrivals**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/nodes/retrieveNode.ts`, `backend/src/ai/nodes/gate2Node.ts`
  - **Goal:** When a new issue arrives, `retrieveNode` searches for existing `unassigned` (WATCHLIST) issues with cosine similarity >= 0.65. If the combined cluster reaches `minClusterSize`, Gate 2 promotes the cluster to `PASS`.
  - **Verification:** Run Test 6 in `test_agent_spec.ts` — borderline watchlist issue transitions to PASS upon subsequent similar reports.

- [x] **TASK H6: Post-Synthesis Evidence ID Validation (Anti-Hallucination)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/nodes/synthesizeNode.ts` (`validateCitedIds`)
  - **Goal:** Validates that any Mongo IDs cited in the synthesized text are strictly a subset of the retrieved evidence IDs.
  - **Verification:** Problem statement draft contains verified `citedMongoIds`.

- [x] **TASK H7: MongoDB ChangeStream & Polling Monitor**
  - **Status:** `IMPLEMENTED` (Combined with Task Q3)
  - **Files:** `backend/src/ai/services/agentQueue.service.ts`

- [x] **TASK H8: End-to-End Tracing via Pipeline `run_id`**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/graph/state.ts`, `backend/src/models/agentRun.ts`, `backend/src/ai/nodes/persistNode.ts`
  - **Goal:** Every pipeline invocation generates a unique `runId` (e.g. `run_m..._abcd`). Persisted in `agent_runs.run_id` and logged in all trace lines.
  - **Verification:** Query `SELECT run_id FROM agent_runs` to inspect execution traces.

---

### 🟡 Section M: Medium Priority

- [x] **TASK M1: Structured 1–5 Research & Industry Scoring in Gate 1**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/prompts/gate1.prompt.ts`, `backend/src/ai/nodes/gate1Node.ts`, `backend/src/ai/graph/state.ts`, `backend/src/models/agentRun.ts`
  - **Goal:** Added 5 research dimensions (Novelty, Measurability, Data Availability, Ethics/Feasibility, Significance) and 5 industry dimensions (Payer, Cost, Market, Feasibility, Scalability) with numerical scores (1-5) and written justifications. Persisted in `agent_runs.research_scores` and `agent_runs.industry_scores`.
  - **Verification:** Gate 1 output JSON returns structured scores and justifications.

- [x] **TASK M2: Problem Statement Track Field (`RESEARCH / INDUSTRY / HYBRID`)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/graph/state.ts`, `backend/src/models/problemStatement.ts`, `backend/src/ai/nodes/gate2Node.ts`, `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** Problem statements and state now store `track` derived from `targetInstitutionType`.
  - **Verification:** Problem statement in Postgres has `track` populated.

- [x] **TASK M3: Context Pattern Metrics Computation**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/nodes/retrieveNode.ts`, `backend/src/ai/graph/state.ts`
  - **Goal:** Computes `recurrenceCount`, `timeSpanYears`, `geographicSpreadKm`, `escalationTrend`, and `repeatedUnresolved` across similar issues.
  - **Verification:** Metrics logged in retrieval trace and passed to Gate 2 & Synthesis nodes.

- [x] **TASK M4: Issue Embeddings Schema Enrichment**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/models/issueEmbedding.ts`, `backend/src/ai/nodes/ingestNode.ts`
  - **Goal:** Added `severity`, `issueStatus`, `createdAtTs`, and `district` columns to `issue_embeddings`.
  - **Verification:** Database stores full metadata alongside the 1024-dimension embedding.

- [x] **TASK M5: Idempotency & Duplicate Run Guards on `agent_runs`**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/models/agentRun.ts`, `backend/src/ai/nodes/persistNode.ts`, `backend/src/ai/nodes/gate2Node.ts`
  - **Goal:** Unique index `agent_runs_issue_run_unique (issue_id, run_id)` added in PostgreSQL. Persist node updates existing row for `runId` rather than duplicating rows.
  - **Verification:** Re-running the pipeline on the same issue updates rather than duplicates audit logs.

- [x] **TASK M6: Deduplication Threshold Externalization**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/config/agent.config.ts`, `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** Moved hardcoded `0.88` dedup threshold to `agentConfig.gate2.dedupSimilarityThreshold`.
  - **Verification:** Config value is consumed in `synthesizeNode.ts`.

- [x] **TASK M7: Self-Check Post-Synthesis Validation Node**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/nodes/synthesizeNode.ts`
  - **Goal:** Validates that synthesis text does not contain solution recommendations or unmeasurable claims. Sets `selfCheckPassed: false` if violations are detected.
  - **Verification:** Synthesis node logs self-check validation status.

- [x] **TASK M8: Dead-Letter Handling for Pipeline Failures**
  - **Status:** `IMPLEMENTED` (Via Task Q4)
  - **Files:** `backend/src/ai/services/agentQueue.service.ts`

- [x] **TASK M9: Prompt File Versioning (`PROMPT_VERSION`)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/prompts/gate1.prompt.ts`, `backend/src/ai/prompts/synthesize.prompt.ts`, `backend/src/models/agentRun.ts`
  - **Goal:** Export constant `export const PROMPT_VERSION = "2.1.0"` in prompt files and record prompt version in `agent_runs.prompt_version`.
  - **Verification:** `agent_runs` records which prompt version generated the output.

- [x] **TASK M10: Full Trace Log Persistence (`run_logs`)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/models/agentRun.ts`, `backend/src/ai/nodes/persistNode.ts`
  - **Goal:** Added `runLogs: text("run_logs")` to `agent_runs` Drizzle schema. Node logs array is serialized and persisted.
  - **Verification:** Query `SELECT run_logs FROM agent_runs` to view complete execution breadcrumbs.

---

### 🟢 Section L: Low Priority & Code Hygiene

- [x] **TASK L1: Gate 2 Case A Similarity Calibration**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/ai/config/agent.config.ts`
  - **Goal:** Tuned `similarityThreshold` to `0.82` (distinct from cluster threshold `0.65`) so issues only join an existing PS if the match is unequivocal.

- [x] **TASK L2: Resilient Queue Implementation**
  - **Status:** `IMPLEMENTED` (Via Task Q1 & Q2)

- [x] **TASK L3: Fix Schema Typo (`annonymous` -> `anonymous`)**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/models/issue.ts`, `backend/src/dto/issue.dto.ts`, `backend/src/services/issue.service.ts`
  - **Goal:** Standardized spelling with backward-compatible support for both `anonymous` and `annonymous`.

- [x] **TASK L4: Automated Spec Verification Suite**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/tests/test_agent_spec.ts`, `backend/package.json`
  - **Goal:** 12 automated test scenarios covering the full agent spec. Run with `npm run test:spec`.

- [x] **TASK L5: pgvector HNSW Query Performance Audit**
  - **Status:** `IMPLEMENTED`
  - **Files:** `backend/src/models/issueEmbedding.ts`, Supabase Postgres database
  - **Goal:** Verified `USING hnsw (embedding vector_cosine_ops)` on `issue_embeddings` and `ps_embeddings`. Verified sub-millisecond query planning and execution times.

---

## 📊 Summary Scorecard

| Category | Total Tasks | Implemented | Pending Verification / Action |
|----------|:-----------:|:-----------:|:-----------------------------:|
| **Queue & Concurrency (Q)** | 5 | 5 | 0 |
| **Blockers (B)** | 3 | 3 | 0 |
| **High Priority (H)** | 8 | 8 | 0 |
| **Medium Priority (M)** | 10 | 10 | 0 |
| **Low Priority (L)** | 5 | 5 | 0 |
| **TOTAL** | **31** | **31** | **0 (100% COMPLETE)** |

---

## 🚦 Next Steps: How to Instruct the Agent

1. **Verify Queue Implementation:**
   - Inspect `backend/src/ai/services/agentQueue.service.ts`
   - Test endpoints: `GET /api/v1/agent/queue`
2. **Execute Remaining Tasks:**
   - Say: **"Do task B1"** to sanitize `.env` and `.gitignore`.
   - Say: **"Do task M1"** to add structured 1-5 Research/Industry scoring.
   - Say: **"Do task M5"** to add database idempotency unique constraints on `agent_runs`.
   - Say: **"Do task M9"** to add prompt versioning.
   - Or say: **"Run the test suite"** to execute `npm run test:spec`.
