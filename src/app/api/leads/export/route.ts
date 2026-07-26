import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listLeads } from "@/lib/leads";
import { listLeadsQuerySchema } from "@/lib/schemas";

// GET /api/leads/export?status=&assigned_to=&search= — streams the
// currently-filtered leads as CSV. Same RLS-backed listLeads() the board
// itself uses, so a member exporting only ever gets what they can already
// see — no separate, wider-access code path for "export."
function csvEscape(value: string | number | boolean | null): string {
  const s = value === null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = listLeadsQuerySchema.safeParse({
    ...Object.fromEntries(req.nextUrl.searchParams),
    pageSize: 100, // export uses its own cap, independent of the board's page size
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data } = await listLeads({ ...parsed.data, page: 1, pageSize: 1000 });

  const header = [
    "name", "email", "phone", "company", "status", "assigned_to", "score", "possible_duplicate", "created_at",
  ];
  const rows = data.map((l) =>
    [l.name, l.email, l.phone, l.company, l.status, l.assigned_to, l.score, l.possible_duplicate, l.created_at]
      .map(csvEscape)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
