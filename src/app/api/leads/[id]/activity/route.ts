import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listActivity, getLead } from "@/lib/leads";

// GET /api/leads/:id/activity — read-only, no POST/PATCH/DELETE route exists
// for this resource at all. Every mutation that should appear here is
// written by lib/leads.ts's logActivity() as a side effect of the actual
// state change (status update, assignment, note add) — there's no direct
// write path a client could use to fabricate an activity entry.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await listActivity(id);
  return NextResponse.json(activity, { status: 200 });
}
