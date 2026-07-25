// BEFORE — a realistic sample of the kind of handler described in ASSESSMENT.md.
// Not from a real codebase — written for this exercise to demonstrate the pattern
// concretely, per the kit's own instruction ("take a realistic bad code sample you
// write yourself").
//
// This is a route handler for "a new lead came in, score it and assign it to a
// rep, then notify them on Slack" — a routing decision, exactly the kind of logic
// Ledgerline's real handlers bury inline.

import express from "express";
import { Pool } from "pg";

const router = express.Router();

// Hardcoded connection string and webhook URL — see ASSESSMENT.md #1. In the real
// scenario these would already be committed to source control.
const pool = new Pool({
  connectionString: "postgres://ledgerline_app:Sup3rSecret!@prod-db.internal:5432/ledgerline",
});
// Illustrative only — not a real webhook format on purpose, so this sample
// doesn't itself trip secret-scanning the way the scenario it's depicting would.
const SLACK_WEBHOOK_URL = "<hardcoded-slack-webhook-url-committed-to-source>";

router.post("/leads/:id/route", async (req, res) => {
  const leadId = req.params.id;
  const { company, employeeCount, dealSizeEstimate, source } = req.body;

  // Business logic buried directly in the handler — see ASSESSMENT.md #4. No
  // validation on any of these fields either — see ASSESSMENT.md (implicit: this
  // throws a TypeError on the next line if dealSizeEstimate is missing or not a
  // number, and Express has no global handler for it here, so the process can
  // crash on a malformed request).
  let priority = 0;
  if (dealSizeEstimate > 50000) priority += 3;
  else if (dealSizeEstimate > 10000) priority += 2;
  else priority += 1;
  if (employeeCount > 500) priority += 2;
  if (source === "referral") priority += 2;
  if (source === "cold_outbound") priority -= 1;

  const repTier = priority >= 5 ? "enterprise" : priority >= 3 ? "mid_market" : "smb";

  // Raw string-concatenated SQL — a SQL injection vector on top of everything
  // else, and exactly the kind of query the frontend also runs directly against
  // this same database per ASSESSMENT.md #3.
  const result = await pool.query(
    `SELECT id, name, email FROM reps WHERE tier = '${repTier}' AND active = true ORDER BY current_load ASC LIMIT 1`
  );
  const rep = result.rows[0];

  await pool.query(
    `UPDATE leads SET assigned_rep_id = '${rep.id}', priority = ${priority} WHERE id = '${leadId}'`
  );

  // No error handling around this network call — if Slack is down or the webhook
  // URL is wrong, this throws inside an async handler with no try/catch, which
  // Express (in versions without built-in async error handling) turns into an
  // unhandled rejection instead of a clean error response.
  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({ text: `New lead ${company} (${repTier}) assigned to ${rep.name}` }),
  });

  res.json({ assignedTo: rep.name, priority, tier: repTier });
});

export default router;
