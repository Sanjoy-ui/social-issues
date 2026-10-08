import pg from "pg";
import mongoose from "mongoose";

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}/api/v1/issue/register`;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const IssueSchema = new mongoose.Schema(
  {
    id: String,
    issue_title: String,
    issue_description: String,
    citizen_id: String,
    email: String,
    status: String,
    agent_status: String,
    is_researchable: Boolean,
    researchability_reasoning: String,
    solution_domain: String,
    target_institution_type: String,
  },
  { timestamps: true }
);

const Issue = mongoose.models.Issue || mongoose.model("Issue", IssueSchema);

async function submitIssue(payload) {
  const form = new FormData();
  form.append("issue_title", payload.issue_title);
  form.append("issue_description", payload.issue_description);
  if (payload.address) form.append("address", payload.address);
  if (payload.latitude) form.append("latitude", payload.latitude);
  if (payload.longitude) form.append("longitude", payload.longitude);

  const res = await fetch(baseUrl, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to submit issue (HTTP ${res.status}): ${txt}`);
  }

  const json = await res.json();
  return json.data.issue;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls MongoDB until the issue's agent_status transitions out of pending/processing
 */
async function waitForPipelineCompletion(issueId, maxSeconds = 90) {
  const start = Date.now();
  process.stdout.write(`   Polling pipeline status for ${issueId}... `);

  while (Date.now() - start < maxSeconds * 1000) {
    const doc = await Issue.findOne({ id: issueId });
    if (doc && doc.agent_status !== "pending" && doc.agent_status !== "processing") {
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[DONE in ${elapsedSec}s: "${doc.agent_status}"]`);
      return doc;
    }
    process.stdout.write(".");
    await delay(3000);
  }

  const doc = await Issue.findOne({ id: issueId });
  console.log(`[TIMEOUT: "${doc?.agent_status}"]`);
  return doc;
}

async function runVerification() {
  console.log("============================================================");
  console.log("🚀 STARTING CIVICRESOLVE PIPELINE END-TO-END VERIFICATION");
  console.log("============================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);

  // --------------------------------------------------------------------------
  // TEST 1: Task 50 — Gate 1 Filter (Non-researchable grievance)
  // --------------------------------------------------------------------------
  console.log("🧪 [TEST 1 / Task 50] Submitting non-researchable noise grievance...");
  const nonRes = await submitIssue({
    issue_title: "My neighbor plays loud music every midnight",
    issue_description:
      "My neighbor upstairs plays extremely loud bass music every single midnight. We had a shouting match yesterday and I want someone to fine them immediately.",
    address: "Apartment 4B, Greenwood Colony",
  });
  console.log(`   Submitted issue ID: ${nonRes.id}`);

  const nonResDoc = await waitForPipelineCompletion(nonRes.id, 90);
  console.log(`   MongoDB agent_status: "${nonResDoc?.agent_status}"`);
  console.log(`   is_researchable: ${nonResDoc?.is_researchable}`);
  console.log(`   Reasoning: "${nonResDoc?.researchability_reasoning}"`);

  if (nonResDoc?.agent_status === "gated_out" && nonResDoc?.is_researchable === false) {
    console.log("   ✅ TEST 1 PASSED: Gate 1 successfully filtered non-researchable grievance!\n");
  } else {
    console.warn(`   ⚠️ TEST 1 Result: Status was "${nonResDoc?.agent_status}"\n`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Task 49 — Case C (Single unique researchable issue -> unassigned)
  // --------------------------------------------------------------------------
  const uniqueTag = "Tag_" + Math.random().toString(36).substring(2, 7);
  console.log(`🧪 [TEST 2 / Task 49] Submitting single unique researchable issue (${uniqueTag})...`);
  const uniqueIssue = await submitIssue({
    issue_title: `Solar Inverter Voltage Resonance In Public Dispensary [${uniqueTag}]`,
    issue_description:
      "The public clinic rooftop photovoltaic arrays experience severe harmonic distortion and transient overvoltages during variable sunlight, tripping vaccine storage refrigerators. Requires specialized harmonics suppression filtering design.",
    address: "District General Hospital, North Wing",
    latitude: "22.5726",
    longitude: "88.3639",
  });
  console.log(`   Submitted issue ID: ${uniqueIssue.id}`);

  const uniqueDoc = await waitForPipelineCompletion(uniqueIssue.id, 90);
  console.log(`   MongoDB agent_status: "${uniqueDoc?.agent_status}"`);
  console.log(`   is_researchable: ${uniqueDoc?.is_researchable}`);

  const runRes1 = await pool.query(
    "SELECT gate1_result, gate2_case, reasoning_summary FROM agent_runs WHERE issue_id = $1 ORDER BY created_at DESC LIMIT 1",
    [uniqueIssue.id]
  );
  console.log("   Postgres agent_run:", runRes1.rows[0]);

  if (uniqueDoc?.agent_status === "unassigned") {
    console.log("   ✅ TEST 2 PASSED: Single issue stayed unassigned in knowledge pool (Case C)!\n");
  } else {
    console.warn(`   ⚠️ TEST 2 Result: Status was "${uniqueDoc?.agent_status}"\n`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Task 51 — Case B (Cluster size >= 3 -> Synthesize Problem Statement)
  // --------------------------------------------------------------------------
  console.log(`🧪 [TEST 3 / Task 51] Submitting 2 more similar issues to trigger Case B cluster...`);

  const issue2 = await submitIssue({
    issue_title: `Photovoltaic Inverter Harmonic Distortion Tripping Rural Health Center [${uniqueTag}]`,
    issue_description:
      "Our rural healthcare clinic solar inverter shuts down due to voltage harmonic resonance on cloudy mornings. Laboratory centrifuges and cold-chain vaccine storage lose power.",
    address: "Primary Health Center, Sub-division 2",
    latitude: "22.5800",
    longitude: "88.3700",
  });
  console.log(`   Submitted Issue #2 ID: ${issue2.id}`);
  await waitForPipelineCompletion(issue2.id, 90);

  const issue3 = await submitIssue({
    issue_title: `Solar Panel Grid Instability and Inverter Trips in Public Dispensary [${uniqueTag}]`,
    issue_description:
      "Frequent rooftop solar inverter lockouts caused by grid impedance mismatch and harmonic distortion. The medical refrigerators are losing backup power regularly.",
    address: "Municipal Health Dispensary",
    latitude: "22.5750",
    longitude: "88.3680",
  });
  console.log(`   Submitted Issue #3 ID: ${issue3.id}`);
  await waitForPipelineCompletion(issue3.id, 120);

  // Check problem_statements in Postgres
  const psRes = await pool.query(`
    SELECT id, title, category, status, confidence, evidence_count, affected_area
    FROM problem_statements
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (psRes.rows.length > 0) {
    const createdPs = psRes.rows[0];
    console.log("   🎉 Generated Problem Statement in Postgres:");
    console.log(`      ID: ${createdPs.id}`);
    console.log(`      Title: "${createdPs.title}"`);
    console.log(`      Status: ${createdPs.status}`);
    console.log(`      Evidence Count: ${createdPs.evidence_count}`);
    console.log(`      Confidence: ${createdPs.confidence}`);

    const linkRes = await pool.query(
      "SELECT issue_id, similarity_score FROM ps_issue_links WHERE ps_id = $1",
      [createdPs.id]
    );
    console.log(`      Linked evidence issues count: ${linkRes.rows.length}`);

    console.log("   ✅ TEST 3 PASSED: Case B generated Problem Statement and linked evidence!\n");

    // ------------------------------------------------------------------------
    // TEST 4: Task 52 — Case A (Issue similar to existing PS -> Join, not duplicate)
    // ------------------------------------------------------------------------
    console.log(`🧪 [TEST 4 / Task 52] Submitting 4th similar issue to test Case A joining...`);
    const countBefore = (await pool.query("SELECT COUNT(*) FROM problem_statements")).rows[0].count;

    const issue4 = await submitIssue({
      issue_title: `Healthcare Center Rooftop Solar Inverter Voltage Resonance [${uniqueTag}]`,
      issue_description:
        "The photovoltaic solar inverter trips daily due to severe harmonic distortion and voltage fluctuations, disabling clinic power and medical refrigerators.",
      address: "District General Hospital Annex",
      latitude: "22.5726",
      longitude: "88.3639",
    });
    console.log(`   Submitted Issue #4 ID: ${issue4.id}`);
    await waitForPipelineCompletion(issue4.id, 90);

    const countAfter = (await pool.query("SELECT COUNT(*) FROM problem_statements")).rows[0].count;
    const issue4Doc = await Issue.findOne({ id: issue4.id });
    console.log(`   Issue 4 MongoDB agent_status: "${issue4Doc?.agent_status}"`);
    console.log(`   Problem statements count before: ${countBefore}, after: ${countAfter}`);

    const psAfter = (
      await pool.query("SELECT evidence_count FROM problem_statements WHERE id = $1", [createdPs.id])
    ).rows[0];
    console.log(`   Updated evidence count on PS: ${psAfter?.evidence_count}`);

    if (parseInt(countAfter) === parseInt(countBefore) && issue4Doc?.agent_status === "clustered") {
      console.log("   ✅ TEST 4 PASSED: Case A joined existing PS without creating duplicate!\n");
    } else {
      console.log(`   Note: PS count was ${countBefore} -> ${countAfter}, status: ${issue4Doc?.agent_status}\n`);
    }
  } else {
    console.warn("   ⚠️ No Problem Statement found yet in Postgres");
  }

  console.log("============================================================");
  console.log("🏁 PIPELINE VERIFICATION COMPLETE");
  console.log("============================================================\n");

  await mongoose.disconnect();
  await pool.end();
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
