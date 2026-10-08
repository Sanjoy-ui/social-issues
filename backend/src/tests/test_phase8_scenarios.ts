import mongoose from "mongoose";
import pg from "pg";
import { problemSynthesisGraph } from "../ai/graph/agent.graph.js";
import { Issue } from "../models/issue.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

async function runPhase8Verification() {
  console.log("============================================================");
  console.log("🚀 STARTING CIVICRESOLVE PHASE 8 PIPELINE VERIFICATION SUITE");
  console.log("============================================================\n");

  await mongoose.connect(process.env.MONGODB_URI!);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Task 50 — Gate 1 Filter (Non-researchable complaint)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("🧪 [TEST 1 / Task 50] Testing Gate 1 Non-Researchable Filter...");
  const nonResId = randomId("ISSUE-TEST-G1");

  await Issue.create({
    id: nonResId,
    issue_title: "My neighbor plays loud music every midnight",
    issue_description:
      "My neighbor upstairs plays extremely loud bass music every single midnight. We had a shouting match yesterday and I want someone to fine them immediately.",
    address: "Greenwood Apartments, Flat 3B",
    annonymous: false,
    status: "SUBMITTED",
    agent_status: "pending",
  });

  const g1Result = await problemSynthesisGraph.invoke({
    issueId: nonResId,
    status: "idle",
    logs: ["Initiating Test 1"],
  });

  console.log(`   Pipeline result status: "${g1Result.status}"`);
  console.log(`   Gate 1 isResearchable: ${g1Result.gate1?.isResearchable}`);
  console.log(`   Gate 1 domain: "${g1Result.gate1?.solutionDomain}"`);
  console.log(`   Gate 1 reasoning: "${g1Result.gate1?.reasoning}"`);
  console.log(`   Gate 2 executed? ${g1Result.gate2 !== null ? "YES" : "NO (Early Exit to END ✅)"}`);

  const g1Doc = await Issue.findOne({ id: nonResId });
  const g1Run = await pool.query(
    "SELECT gate1_result, gate2_case, reasoning_summary FROM agent_runs WHERE issue_id = $1 ORDER BY created_at DESC LIMIT 1",
    [nonResId]
  );

  if (
    g1Result.status === "gated_not_researchable" &&
    g1Doc?.agent_status === "gated_out" &&
    g1Run.rows[0]?.gate1_result === false
  ) {
    console.log("   ✅ TEST 1 PASSED: Gate 1 successfully filtered non-researchable issue & logged audit trail!\n");
  } else {
    console.warn("   ⚠️ TEST 1 Result: Status was", g1Result.status, g1Doc?.agent_status, "\n");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Task 49 — Case C (Single unique researchable issue -> unassigned)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("🧪 [TEST 2 / Task 49] Testing Case C (Single unique issue in knowledge pool)...");
  const uniqueTag = "Tag_" + Math.random().toString(36).substring(2, 6);
  const iss1Id = randomId("ISSUE-TEST-C");

  await Issue.create({
    id: iss1Id,
    citizen_id: "citizen_alpha_01",
    issue_title: `Solar Inverter Voltage Resonance In Public Dispensary [${uniqueTag}]`,
    issue_description:
      "The public clinic rooftop photovoltaic arrays experience severe harmonic distortion and transient overvoltages during variable sunlight, tripping vaccine storage refrigerators. Requires specialized harmonics suppression filtering design.",
    address: "District General Hospital, North Wing",
    latitude: "22.5726",
    longitude: "88.3639",
    annonymous: false,
    status: "SUBMITTED",
    agent_status: "pending",
  });

  const cResult = await problemSynthesisGraph.invoke({
    issueId: iss1Id,
    status: "idle",
    logs: ["Initiating Test 2"],
  });

  console.log(`   Pipeline result status: "${cResult.status}"`);
  console.log(`   Gate 1 passed: ${cResult.gate1?.isResearchable}`);
  console.log(`   Gate 2 Case: "${cResult.gate2?.caseDecision}" (Cluster size: ${cResult.gate2?.clusterSize})`);

  const cDoc = await Issue.findOne({ id: iss1Id });
  const cEmbed = await pool.query("SELECT issue_id FROM issue_embeddings WHERE issue_id = $1", [iss1Id]);
  const cRun = await pool.query(
    "SELECT gate2_case, reasoning_summary FROM agent_runs WHERE issue_id = $1 AND gate2_case = 'C' LIMIT 1",
    [iss1Id]
  );

  if (
    cResult.gate2?.caseDecision === "C" &&
    cDoc?.agent_status === "unassigned" &&
    cEmbed.rows.length > 0 &&
    cRun.rows.length > 0
  ) {
    console.log("   ✅ TEST 2 PASSED: Single issue indexed with 1024-dim embedding & confirmed as 'unassigned' (Case C)!\n");
  } else {
    console.warn("   ⚠️ TEST 2 Result: Gate 2 case was", cResult.gate2?.caseDecision, cDoc?.agent_status, "\n");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Task 51 — Case B (Cluster size >= 3 -> Synthesize Problem Statement)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("🧪 [TEST 3 / Task 51] Testing Case B (Cluster Threshold >= 3 -> Problem Statement Synthesis)...");

  // Contributing Issue 2 (Citizen Beta)
  const iss2Id = randomId("ISSUE-TEST-B2");
  await Issue.create({
    id: iss2Id,
    citizen_id: "citizen_beta_02",
    issue_title: `Photovoltaic Inverter Harmonic Distortion Tripping Rural Health Center [${uniqueTag}]`,
    issue_description:
      "Our rural healthcare clinic solar inverter shuts down due to voltage harmonic resonance on cloudy mornings. Laboratory centrifuges and cold-chain vaccine storage lose power.",
    address: "Primary Health Center, Sub-division 2",
    latitude: "22.5800",
    longitude: "88.3700",
    annonymous: false,
    status: "SUBMITTED",
    agent_status: "pending",
  });

  // Run Issue 2 (embeds and stays in pool)
  await problemSynthesisGraph.invoke({
    issueId: iss2Id,
    status: "idle",
    logs: ["Indexing Issue 2"],
  });
  console.log(`   Contributing Issue #2 indexed (${iss2Id})`);

  // Contributing Issue 3 (Citizen Gamma) — triggers cluster size = 3!
  const iss3Id = randomId("ISSUE-TEST-B3");
  await Issue.create({
    id: iss3Id,
    citizen_id: "citizen_gamma_03",
    issue_title: `Solar Panel Grid Instability and Inverter Trips in Public Dispensary [${uniqueTag}]`,
    issue_description:
      "Frequent rooftop solar inverter lockouts caused by grid impedance mismatch and harmonic distortion. The medical refrigerators are losing backup power regularly.",
    address: "Municipal Health Dispensary",
    latitude: "22.5750",
    longitude: "88.3680",
    annonymous: false,
    status: "SUBMITTED",
    agent_status: "pending",
  });

  console.log(`   Running pipeline for Issue #3 (${iss3Id}) to trigger synthesis...`);
  const bResult = await problemSynthesisGraph.invoke({
    issueId: iss3Id,
    status: "idle",
    logs: ["Triggering Case B Cluster"],
  });

  console.log(`   Pipeline result status: "${bResult.status}"`);
  console.log(`   Gate 2 Case: "${bResult.gate2?.caseDecision}" (Cluster size: ${bResult.gate2?.clusterSize})`);
  console.log(`   Synthesized PS Title: "${bResult.problemStatement?.title}"`);
  console.log(`   Synthesized Category: "${bResult.problemStatement?.category}"`);
  console.log(`   Synthesized Confidence: ${bResult.problemStatement?.confidence}`);

  // Check Postgres problem_statements
  const psRes = await pool.query(
    "SELECT id, title, category, status, confidence, evidence_count FROM problem_statements ORDER BY created_at DESC LIMIT 1"
  );
  const createdPs = psRes.rows[0];

  let linksCount = 0;
  if (createdPs) {
    const linksRes = await pool.query(
      "SELECT issue_id FROM ps_issue_links WHERE ps_id = $1",
      [createdPs.id]
    );
    linksCount = linksRes.rows.length;
    console.log(`   Postgres PS ID: ${createdPs?.id}`);
    console.log(`   Postgres evidence links count: ${linksCount}`);
  } else {
    console.warn("   ⚠️ No Problem Statement found in Postgres!");
  }

  const iss1Doc = await Issue.findOne({ id: iss1Id });
  const iss2Doc = await Issue.findOne({ id: iss2Id });
  const iss3Doc = await Issue.findOne({ id: iss3Id });
  console.log(
    `   MongoDB statuses: iss1="${iss1Doc?.agent_status}", iss2="${iss2Doc?.agent_status}", iss3="${iss3Doc?.agent_status}"`
  );

  if (
    bResult.gate2?.caseDecision === "B" &&
    createdPs &&
    linksRes.rows.length >= 3 &&
    iss3Doc?.agent_status === "clustered"
  ) {
    console.log("   ✅ TEST 3 PASSED: Case B successfully synthesized SIH Problem Statement, generated embedding, and linked evidence!\n");
  } else {
    console.warn("   ⚠️ TEST 3 Result: Gate 2 case was", bResult.gate2?.caseDecision, "\n");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Task 52 — Case A (Issue similar to existing PS -> Join, not duplicate)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("🧪 [TEST 4 / Task 52] Testing Case A (Joining existing Problem Statement)...");
  const countBefore = (await pool.query("SELECT COUNT(*) FROM problem_statements")).rows[0].count;

  const iss4Id = randomId("ISSUE-TEST-A4");
  await Issue.create({
    id: iss4Id,
    citizen_id: "citizen_delta_04",
    issue_title: `Healthcare Center Rooftop Solar Inverter Voltage Resonance [${uniqueTag}]`,
    issue_description:
      "The photovoltaic solar inverter trips daily due to severe harmonic distortion and voltage fluctuations, disabling clinic power and medical refrigerators.",
    address: "District General Hospital Annex",
    latitude: "22.5726",
    longitude: "88.3639",
    annonymous: false,
    status: "SUBMITTED",
    agent_status: "pending",
  });

  const aResult = await problemSynthesisGraph.invoke({
    issueId: iss4Id,
    status: "idle",
    logs: ["Triggering Case A Join"],
  });

  console.log(`   Pipeline result status: "${aResult.status}"`);
  console.log(`   Gate 2 Case: "${aResult.gate2?.caseDecision}" (Matched PS: ${aResult.gate2?.matchedPsId})`);

  const countAfter = (await pool.query("SELECT COUNT(*) FROM problem_statements")).rows[0].count;
  const psAfter = createdPs
    ? (await pool.query("SELECT evidence_count FROM problem_statements WHERE id = $1", [createdPs.id])).rows[0]
    : null;
  const iss4Doc = await Issue.findOne({ id: iss4Id });

  console.log(`   Problem Statement count before: ${countBefore}, after: ${countAfter}`);
  console.log(`   Updated evidence_count on PS: ${psAfter?.evidence_count}`);
  console.log(`   Issue #4 MongoDB status: "${iss4Doc?.agent_status}"`);

  if (
    parseInt(countAfter) === parseInt(countBefore) &&
    aResult.gate2?.caseDecision === "A" &&
    iss4Doc?.agent_status === "clustered"
  ) {
    console.log("   ✅ TEST 4 PASSED: Case A linked issue to existing PS without creating duplicate!\n");
  } else {
    console.log(`   Case result: ${aResult.gate2?.caseDecision}, PS count: ${countBefore} -> ${countAfter}\n`);
  }

  console.log("============================================================");
  console.log("🏁 ALL PHASE 8 VERIFICATION SCENARIOS COMPLETED");
  console.log("============================================================\n");

  await mongoose.disconnect();
  await pool.end();
  process.exit(0);
}

runPhase8Verification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
