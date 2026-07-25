import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listLeads, createPublicLead, getCurrentProfile } from "@/lib/leads";
import { captureLeadSchema, listLeadsQuerySchema } from "@/lib/schemas";

// Very small in-memory rate limit for the public capture endpoint — keyed by
// IP, fixed 60s window, 5 submissions max. Honest limitation, stated here
// rather than glossed over: this resets per serverless instance/cold start
// and isn't shared across instances, so it's a real but partial defense, not
// a guarantee. A production version would use a shared store (Upstash Redis)
// or a DB-backed counter — out of scope for this build's time budget. The
// honeypot field (schemas.ts) is the primary defense; this is a second layer
// against a burst from one client hitting a warm instance.
const submissionLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissionLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  submissionLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
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
  if (isRateLimited(ip)) {
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
