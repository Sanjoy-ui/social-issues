import mongoose from "mongoose";
import { problemSynthesisGraph } from "./src/ai/graph/agent.graph.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Invoking graph directly for ISSUE-MUZ8PQAK-50C6A0...");
  try {
    const res = await problemSynthesisGraph.invoke({
      issueId: "ISSUE-MUZ8PQAK-50C6A0",
      status: "idle",
      logs: ["Manual direct invoke test"],
    });
    console.log("SUCCESS! Graph result status:", res.status);
    console.log("Logs:", res.logs);
    console.log("Gate1 result:", res.gate1);
    console.log("Gate2 result:", res.gate2);
  } catch (err) {
    console.error("Graph execution threw error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
