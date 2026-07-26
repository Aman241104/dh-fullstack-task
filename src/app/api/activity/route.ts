import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listAllActivity } from "@/lib/leads";

// GET /api/activity — the team-wide feed. RLS on lead_activity decides
// scope per-session (see listAllActivity's comment) - no admin-only gate
// needed here, a member calling this just gets a smaller, correctly
// scoped result set instead of a 403.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activity = await listAllActivity(50);
  return NextResponse.json(activity, { status: 200 });
}
