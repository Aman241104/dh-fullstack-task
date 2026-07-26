// Resend email notifications — raw fetch to Resend's REST API, no SDK,
// consistent with whatsapp-agents' lib/email.ts pattern (same provider,
// same "call the HTTP API directly" style). Fails open: a missing key or a
// Resend outage logs a warning and returns false, never throws — a lead
// capture must never fail because a notification email couldn't send.

const RESEND_URL = "https://api.resend.com/emails";

export async function notifyNewLead(lead: {
  name: string;
  email: string;
  company?: string | null;
  score: number;
  possibleDuplicate: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESEND_NOTIFY_EMAIL;
  if (!apiKey || !to) {
    console.warn("[notify] RESEND_API_KEY or RESEND_NOTIFY_EMAIL not set — skipping email");
    return false;
  }

  const subjectFlags = lead.possibleDuplicate ? " [possible duplicate]" : "";

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Docket <onboarding@resend.dev>",
        to,
        subject: `New lead: ${lead.name}${subjectFlags}`,
        html: `
          <p><strong>${lead.name}</strong> (${lead.email}) just came in${lead.company ? ` from ${lead.company}` : ""}.</p>
          <p>Score: ${lead.score}/100</p>
          ${lead.possibleDuplicate ? "<p><strong>Note:</strong> this looks like a possible duplicate of an existing lead.</p>" : ""}
        `,
      }),
    });
    if (!res.ok) {
      console.warn("[notify] Resend returned", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[notify] Failed to send:", e);
    return false;
  }
}
