import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLead, dismissDuplicateFlag } from "@/lib/leads";

// POST /api/leads/:id/dismiss-duplicate — clears possible_duplicate. Open
// to admin or the assigned member, same as status updates; RLS's
// leads_member_update_own policy backstops this the same way it does for
// PATCH /api/leads/:id.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getLead(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await dismissDuplicateFlag(id, user.id);
    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
