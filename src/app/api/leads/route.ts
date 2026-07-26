import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { listLeads, createPublicLead, getCurrentProfile } from "@/lib/leads";
import { captureLeadSchema, listLeadsQuerySchema } from "@/lib/schemas";

// DB-backed rate limit via the check_rate_limit() security definer function
// (see the 20260726000003 migration) — replaces the earlier in-memory
// version, which was an honestly-disclosed limitation (reset per serverless
// instance/cold start, not shared across instances). This is a real, shared
// counter regardless of which instance handles the request. The IP is
// hashed before use as the lookup key — rate_limit_events never stores a
// raw, reversible IP address.
async function isRateLimited(ip: string): Promise<boolean> {
  const key = createHash("sha256").update(ip).digest("hex");
  const supabase = await createClient();
  const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: 60,
    p_max: 5,
  });
  if (error) {
    // Fail open on an infra hiccup — a broken rate limiter should not take
    // down the public capture form. The honeypot field is the primary
    // defense either way.
    console.warn("[rate-limit] check_rate_limit failed:", error.message);
    return false;
  }
  return !allowed;
}

// GET /api/leads?page=&pageSize=&status=&assigned_to=&search=
// Authenticated only — 401 with no session. Pagination/filtering is real
// (backed by RLS, not client-side slicing): a member's request only ever
// sees rows RLS grants them, admin sees everything.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = listLeadsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await listLeads(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/leads — the public capture form. Runs as `anon`, no auth
// required by design. RLS's leads_public_insert policy (INSERT-only,
// status='new', assigned_to=null) is the real boundary; the checks here
// (honeypot, rate limit, schema validation) are defense-in-depth on top of
// it, not a substitute for it.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many submissions, try again shortly" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = captureLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Honeypot tripped — pretend success so a bot doesn't learn it was caught,
  // but don't actually write anything.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  try {
    await createPublicLead(parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
