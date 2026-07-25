// AFTER — the webhook URL comes from an environment variable, never
// committed to source. The fetch call is wrapped so a Slack outage can't
// take down the request that triggered it (see route.ts).

export async function notifyRepAssigned(company: string, tier: string, repName: string): Promise<void> {
  const webhookUrl = process.env.SLACK_LEAD_ROUTING_WEBHOOK_URL;
  if (!webhookUrl) return; // not configured in this environment — silently skip, don't crash

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `New lead ${company} (${tier}) assigned to ${repName}` }),
    });
  } catch {
    // A failed Slack notification is not a reason to fail the request that
    // assigned the lead — the assignment already succeeded by the time this
    // runs. Swallow it here; a real system would log it to the same
    // structured logging every other handler uses.
  }
}
