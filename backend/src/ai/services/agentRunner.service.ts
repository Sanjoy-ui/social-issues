import { problemSynthesisGraph } from "../graph/agent.graph.js";
import type { IIssue } from "../../models/issue.js";

// In-memory FIFO queue to guarantee ordered, serialized pipeline execution
// and protect against concurrent API rate limit collisions
const pipelineQueue: IIssue[] = [];
let isProcessingQueue = false;

async function processNextInQueue(): Promise<void> {
  if (isProcessingQueue || pipelineQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  const issue = pipelineQueue.shift()!;

  try {
    console.log(`\n🤖 [AI Agent] Dispatched issue to LangGraph pipeline: ${issue.id}`);
    console.log(`   Title: "${issue.issue_title}"`);

    const result = await problemSynthesisGraph.invoke({
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
      logs: [`[Trigger] Issue ${issue.id} received from citizen registration`],
    });

    console.log(
      `🤖 [AI Agent] Pipeline completed for issue ${issue.id}. Status: ${result.status}`
    );
    if (result.logs && result.logs.length > 0) {
      console.log(`   Trace: ${result.logs.join(" -> ")}\n`);
    }
  } catch (error: any) {
    console.error(
      `❌ [AI Agent] Pipeline failed for issue ${issue.id}:`,
      error?.message || error
    );
  } finally {
    isProcessingQueue = false;
    // Process next item if queued
    if (pipelineQueue.length > 0) {
      setTimeout(() => processNextInQueue(), 200);
    }
  }
}

/**
 * Asynchronously queues and triggers the AI Agent problem synthesis graph for a newly registered issue.
 * Fire-and-forget: Execution errors are caught and logged without affecting the HTTP response.
 */
export async function triggerAgentForIssue(issue: IIssue): Promise<void> {
  pipelineQueue.push(issue);
  processNextInQueue();
}
