import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLead, updateLeadStatus } from "@/lib/leads";
import { updateStatusSchema } from "@/lib/schemas";

// GET /api/leads/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  // RLS returns null (not an error) for a row the caller can't see — a member
  // requesting someone else's lead gets the same 404 as a lead that doesn't
  // exist at all. That's deliberate: it doesn't confirm to an unauthorized
  // caller that the row exists, just that they can't have it.
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead, { status: 200 });
}

// PATCH /api/leads/:id — status change. Open to admin or the assigned
// member; RLS's leads_member_update_own policy backstops this even if this
// check were somehow bypassed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getLead(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await updateLeadStatus(id, parsed.data.status, user.id);
    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
