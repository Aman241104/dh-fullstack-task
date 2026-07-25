import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignLead, getCurrentProfile, getLead } from "@/lib/leads";
import { assignLeadSchema } from "@/lib/schemas";

// PATCH /api/leads/:id/assign — admin-only. Checked explicitly here (403,
// clean error) rather than relying only on RLS to reject it — RLS is still
// the real backstop (leads_member_update_own's with-check never grants a
// member permission to write assigned_to on any row), but a raw Postgres RLS
// violation bubbling up as a 500 is a worse API contract than a deliberate
// 403 with a message explaining why.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = assignLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getLead(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await assignLead(id, parsed.data.assigned_to, user.id);
    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
