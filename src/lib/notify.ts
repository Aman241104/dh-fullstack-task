// Resend email notifications — raw fetch to Resend's REST API, no SDK,
// consistent with whatsapp-agents' lib/email.ts pattern (same provider,
// same "call the HTTP API directly" style). Fails open: a missing key or a
// Resend outage logs a warning and returns false, never throws — a lead
// capture must never fail because a notification email couldn't send.

import { createClient } from "@/lib/supabase/server";

const RESEND_URL = "https://api.resend.com/emails";

// Admin-configurable via Settings (app_settings.alert_email, read through
// the get_alert_email() security definer function so this works from the
// anon-role public capture path too). Falls back to RESEND_NOTIFY_EMAIL
// when no admin has set one yet, so existing deployments keep working
// unchanged.
async function resolveAlertEmail(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_alert_email");
  return data || process.env.RESEND_NOTIFY_EMAIL;
}

export async function notifyNewLead(lead: {
  name: string;
  email: string;
  company?: string | null;
  score: number;
  possibleDuplicate: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = await resolveAlertEmail();
  if (!apiKey || !to) {
    console.warn("[notify] RESEND_API_KEY not set or no alert email configured — skipping email");
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
