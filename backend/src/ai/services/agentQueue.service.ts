import crypto from "crypto";
import { problemSynthesisGraph } from "../graph/agent.graph.js";
import { Issue, type IIssue } from "../../models/issue.js";
import { agentConfig } from "../config/agent.config.js";

export interface QueueJob {
  issueId: string;
  retryCount: number;
  enqueuedAt: number;
}

export interface QueueStats {
  queueDepth: number;
  activeWorkers: number;
  concurrency: number;
  isRunning: boolean;
  changeStreamActive: boolean;
  pollingFallbackActive: boolean;
  dbCounts: {
    pending: number;
    processing: number;
    gated_out: number;
    clustered: number;
    unassigned: number;
    failed: number;
  };
}

class AgentQueueService {
  private queue: QueueJob[] = [];
  private inMemorySet: Set<string> = new Set();
  private activeWorkers = 0;
  private isRunning = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private changeStream: any = null;
  private isChangeStreamActive = false;
  private isPollingFallbackActive = false;

  private get concurrency(): number {
    return agentConfig.queue?.concurrency || 1;
  }

  private get pollIntervalMs(): number {
    return agentConfig.queue?.pollIntervalMs || 5000;
  }

  private get maxRetries(): number {
    return agentConfig.queue?.maxRetries || 3;
  }

  private get retryDelayMs(): number {
    return agentConfig.queue?.retryDelayMs || 2000;
  }

  /**
   * Start the agent queue:
   * 1. Recovers any interrupted or pending issues from MongoDB
   * 2. Starts real-time MongoDB ChangeStream (or falls back to polling)
   * 3. Kicks off sequential worker loop
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log("ℹ️ [AgentQueue] Queue service is already running.");
      return;
    }

    this.isRunning = true;
    console.log(
      `🚀 [AgentQueue] Initializing AI Agent Queue (concurrency: ${this.concurrency}, maxRetries: ${this.maxRetries})...`
    );

    // Step 1: Crash recovery on boot
    await this.recoverPendingIssues();

    // Step 2: Real-time change stream with polling fallback
    await this.setupMongoMonitor();

    // Step 3: Trigger queue processing
    this.triggerProcessNext();
  }

  /**
   * Stop the queue gracefully (e.g., during app shutdown)
   */
  public async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      this.isPollingFallbackActive = false;
    }

    if (this.changeStream) {
      try {
        await this.changeStream.close();
      } catch (err) {
        // Ignore close errors
      }
      this.changeStream = null;
      this.isChangeStreamActive = false;
    }

    console.log(
      `🛑 [AgentQueue] Queue service stopped. Pending jobs in memory: ${this.queue.length}, active: ${this.activeWorkers}`
    );
  }

  /**
   * Enqueue an issue ID for asynchronous serialized AI agent processing.
   * Deduplicates against already-queued or currently-processing issues.
   */
  public async enqueue(issueId: string, retryCount = 0): Promise<{ enqueued: boolean; queueDepth: number }> {
    if (!issueId) {
      return { enqueued: false, queueDepth: this.queue.length };
    }

    if (this.inMemorySet.has(issueId)) {
      return { enqueued: false, queueDepth: this.queue.length };
    }

    this.inMemorySet.add(issueId);
    this.queue.push({
      issueId,
      retryCount,
      enqueuedAt: Date.now(),
    });

    console.log(
      `📥 [AgentQueue] Enqueued issue "${issueId}" (queue depth: ${this.queue.length}, active: ${this.activeWorkers})`
    );

    this.triggerProcessNext();
    return { enqueued: true, queueDepth: this.queue.length };
  }

  /**
   * Crash recovery: Queries MongoDB for issues that are still "pending"
   * or were left in "processing" due to an unexpected process restart.
   */
  public async recoverPendingIssues(): Promise<number> {
    try {
      // 1. Reset any issues abandoned in "processing" state
      const abandonedRes = await Issue.updateMany(
        { agent_status: "processing" },
        { $set: { agent_status: "pending" } }
      );
      if (abandonedRes.modifiedCount > 0) {
        console.warn(
          `⚠️ [AgentQueue] Reset ${abandonedRes.modifiedCount} abandoned "processing" issue(s) back to "pending".`
        );
      }

      // 2. Fetch all pending issues in chronological FIFO order
      const pendingDocs = await Issue.find({ agent_status: "pending" })
        .sort({ createdAt: 1 })
        .limit(200);

      let recoveredCount = 0;
      for (const doc of pendingDocs) {
        if (!this.inMemorySet.has(doc.id)) {
          this.inMemorySet.add(doc.id);
          this.queue.push({
            issueId: doc.id,
            retryCount: 0,
            enqueuedAt: Date.now(),
          });
          recoveredCount++;
        }
      }

      if (recoveredCount > 0) {
        console.log(
          `🔄 [AgentQueue] Recovered ${recoveredCount} pending issue(s) from MongoDB into processing queue.`
        );
      }

      return recoveredCount;
    } catch (err: any) {
      console.error("❌ [AgentQueue] Failed to recover pending issues from MongoDB:", err?.message || err);
      return 0;
    }
  }

  /**
   * Monitor MongoDB for new issues:
   * Tries MongoDB Change Stream first; falls back automatically to a periodic polling loop.
   */
  private async setupMongoMonitor(): Promise<void> {
    try {
      // Try ChangeStream (requires MongoDB Replica Set)
      this.changeStream = Issue.watch([{ $match: { operationType: "insert" } }]);

      this.changeStream.on("change", (change: any) => {
        if (change.operationType === "insert" && change.fullDocument) {
          const doc = change.fullDocument;
          if (doc.id && (!doc.agent_status || doc.agent_status === "pending")) {
            console.log(`⚡ [AgentQueue] ChangeStream detected new issue insert: ${doc.id}`);
            this.enqueue(doc.id);
          }
        }
      });

      this.changeStream.on("error", (err: any) => {
        console.warn(
          `⚠️ [AgentQueue] ChangeStream encountered error, switching to polling fallback:`,
          err?.message || err
        );
        this.fallbackToPolling();
      });

      this.isChangeStreamActive = true;
      console.log("📡 [AgentQueue] MongoDB ChangeStream active for real-time grievance monitoring.");
    } catch (err: any) {
      console.log(
        `ℹ️ [AgentQueue] MongoDB ChangeStream not supported in this environment (${err?.message || "standalone instance"}). Starting polling fallback.`
      );
      this.fallbackToPolling();
    }
  }

  /**
   * Activates background polling loop for environments without replica sets
   */
  private fallbackToPolling(): void {
    if (this.pollingTimer) return;

    this.isChangeStreamActive = false;
    this.isPollingFallbackActive = true;

    this.pollingTimer = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        const pending = await Issue.find({ agent_status: "pending" })
          .sort({ createdAt: 1 })
          .limit(20);

        for (const doc of pending) {
          if (!this.inMemorySet.has(doc.id)) {
            await this.enqueue(doc.id);
          }
        }
      } catch (err) {
        // Suppress transient poll errors
      }
    }, this.pollIntervalMs);

    console.log(`⏱️ [AgentQueue] Polling fallback active (every ${this.pollIntervalMs}ms).`);
  }

  /**
   * Triggers worker to process the next job in the queue if concurrency permits.
   */
  private triggerProcessNext(): void {
    if (!this.isRunning) return;

    while (this.activeWorkers < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.activeWorkers++;
      this.processJob(job).finally(() => {
        this.activeWorkers--;
        // Pacing delay between jobs to prevent API rate limit bursts
        setTimeout(() => this.triggerProcessNext(), 200);
      });
    }
  }

  /**
   * Process an individual issue job through the LangGraph AI pipeline.
   */
  private async processJob(job: QueueJob): Promise<void> {
    const { issueId, retryCount } = job;
    const runId = `run_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

    try {
      // 1. Fetch fresh issue document from MongoDB
      const issue = await Issue.findOne({ id: issueId });
      if (!issue) {
        console.warn(`⚠️ [AgentQueue] Issue ${issueId} not found in MongoDB. Dropping from queue.`);
        this.inMemorySet.delete(issueId);
        return;
      }

      // 2. Mark status as processing in MongoDB
      await Issue.updateOne(
        { id: issueId },
        { $set: { agent_status: "processing" } }
      );

      console.log(
        `\n🤖 [AgentQueue] Executing AI Agent pipeline for issue: ${issue.id} (runId: ${runId}, attempt: ${retryCount + 1}/${this.maxRetries + 1})`
      );
      console.log(`   Title: "${issue.issue_title}"`);

      // 3. Invoke LangGraph pipeline
      const result = await problemSynthesisGraph.invoke({
        runId,
        issueId: issue.id,
        issue: {
          id: issue.id,
          title: issue.issue_title,
          description: issue.issue_description,
          latitude: issue.latitude || null,
          longitude: issue.longitude || null,
          proofUrls: issue.issue_proof || [],
        },
        status: "idle",
        urgentEscalation: false,
        logs: [`[Queue] Picked up issue ${issue.id} (runId: ${runId}, attempt: ${retryCount + 1})`],
      });

      console.log(
        `✅ [AgentQueue] Pipeline completed for issue ${issue.id}. Status: ${result.status}. Gate 2: ${result.gate2?.decision || "N/A"}`
      );
      if (result.logs && result.logs.length > 0) {
        console.log(`   Trace [${runId}]: ${result.logs.join(" -> ")}\n`);
      }

      // Success: Remove from in-memory set
      this.inMemorySet.delete(issueId);
    } catch (error: any) {
      console.error(
        `❌ [AgentQueue] Pipeline execution failed for issue ${issueId} (runId: ${runId}, attempt: ${retryCount + 1}):`,
        error?.message || error
      );

      if (retryCount < this.maxRetries) {
        const nextAttempt = retryCount + 1;
        const delay = Math.min(this.retryDelayMs * Math.pow(2, retryCount), 30000);
        console.warn(
          `🔁 [AgentQueue] Retrying issue ${issueId} in ${delay}ms (attempt ${nextAttempt + 1}/${this.maxRetries + 1})...`
        );

        // Reset Mongo status to pending for retry
        await Issue.updateOne(
          { id: issueId },
          { $set: { agent_status: "pending" } }
        ).catch(() => {});

        setTimeout(() => {
          this.inMemorySet.delete(issueId);
          this.enqueue(issueId, nextAttempt);
        }, delay);
      } else {
        // Max retries exceeded: Dead-letter handling
        console.error(
          `💀 [AgentQueue] Max retries exhausted for issue ${issueId}. Marking as "failed" in MongoDB (Dead-Letter).`
        );
        await Issue.updateOne(
          { id: issueId },
          { $set: { agent_status: "failed" } }
        ).catch(() => {});

        this.inMemorySet.delete(issueId);
      }
    }
  }

  /**
   * Get queue health & depth telemetry
   */
  public async getStats(): Promise<QueueStats> {
    const counts = {
      pending: 0,
      processing: 0,
      gated_out: 0,
      clustered: 0,
      unassigned: 0,
      failed: 0,
    };

    try {
      const agg = await Issue.aggregate([
        { $group: { _id: "$agent_status", count: { $sum: 1 } } },
      ]);
      for (const row of agg) {
        if (row._id && row._id in counts) {
          counts[row._id as keyof typeof counts] = row.count;
        }
      }
    } catch (err) {
      // In case DB is unavailable
    }

    return {
      queueDepth: this.queue.length,
      activeWorkers: this.activeWorkers,
      concurrency: this.concurrency,
      isRunning: this.isRunning,
      changeStreamActive: this.isChangeStreamActive,
      pollingFallbackActive: this.isPollingFallbackActive,
      dbCounts: counts,
    };
  }

  /**
   * Re-enqueue all failed issues from MongoDB
   */
  public async retryFailed(): Promise<number> {
    try {
      const failedIssues = await Issue.find({ agent_status: "failed" });
      let reEnqueued = 0;
      for (const doc of failedIssues) {
        await Issue.updateOne({ id: doc.id }, { $set: { agent_status: "pending" } });
        await this.enqueue(doc.id, 0);
        reEnqueued++;
      }
      return reEnqueued;
    } catch (err: any) {
      console.error("❌ [AgentQueue] Failed to retry failed issues:", err?.message || err);
      return 0;
    }
  }
}

export const agentQueue = new AgentQueueService();

/**
 * Backward-compatible helper for controllers:
 * Accepts either an IIssue object or an issueId string.
 */
export async function triggerAgentForIssue(issue: IIssue | string): Promise<void> {
  const issueId = typeof issue === "string" ? issue : issue.id;
  await agentQueue.enqueue(issueId);
}

export async function startAgentQueue(): Promise<void> {
  await agentQueue.start();
}

export async function stopAgentQueue(): Promise<void> {
  await agentQueue.stop();
}
