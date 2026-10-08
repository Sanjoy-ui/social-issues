import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "./state.js";
import { ingestNode } from "../nodes/ingestNode.js";
import { gate1Node } from "../nodes/gate1Node.js";
import { retrieveNode } from "../nodes/retrieveNode.js";
import { gate2Node } from "../nodes/gate2Node.js";
import { synthesizeNode } from "../nodes/synthesizeNode.js";
import { persistNode } from "../nodes/persistNode.js";

/**
 * Gate 1 routing condition:
 * - If issue is not researchable (or failed), route directly to END
 * - If researchable, proceed to candidate retrieval
 */
function routeAfterGate1(state: AgentState): "continue" | "stop" {
  if (
    state.status === "gated_not_researchable" ||
    state.gate1?.isResearchable === false ||
    state.status === "failed"
  ) {
    return "stop";
  }
  return "continue";
}

/**
 * Gate 2 routing condition:
 * - Case B (cluster threshold met) or Case E (critical urgency): route to synthesize_statement
 * - Case A (join existing PS) or Case C (unassigned wait): route directly to persist_outcome
 */
function routeAfterGate2(state: AgentState): "synthesize" | "persist" {
  const caseDecision = state.gate2?.caseDecision;
  if (caseDecision === "B" || caseDecision === "E") {
    return "synthesize";
  }
  return "persist";
}

// Construct the StateGraph workflow
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("ingest_issue", ingestNode)
  .addNode("evaluate_gate1", gate1Node)
  .addNode("retrieve_candidates", retrieveNode)
  .addNode("evaluate_gate2", gate2Node)
  .addNode("synthesize_statement", synthesizeNode)
  .addNode("persist_outcome", persistNode)
  .addEdge(START, "ingest_issue")
  .addEdge("ingest_issue", "evaluate_gate1")
  .addConditionalEdges("evaluate_gate1", routeAfterGate1, {
    continue: "retrieve_candidates",
    stop: END,
  })
  .addEdge("retrieve_candidates", "evaluate_gate2")
  .addConditionalEdges("evaluate_gate2", routeAfterGate2, {
    synthesize: "synthesize_statement",
    persist: "persist_outcome",
  })
  .addEdge("synthesize_statement", "persist_outcome")
  .addEdge("persist_outcome", END);

// Compile the LangGraph agent
export const problemSynthesisGraph = workflow.compile();

/**
 * Returns true if the LangGraph agent was successfully compiled into an executable runnable
 */
export function isGraphCompiled(): boolean {
  return typeof problemSynthesisGraph?.invoke === "function";
}
