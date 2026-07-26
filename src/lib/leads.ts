import { createClient } from "@/lib/supabase/server";
import { scoreLead } from "@/lib/ai/scoring";
import { notifyNewLead } from "@/lib/notify";
import type { Lead, LeadNote, LeadActivity, Profile, LeadStatus, Paginated } from "@/lib/types";

// ─── Current user ───────────────────────────────────────────────────────────

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

// ─── Leads ──────────────────────────────────────────────────────────────────
// Every function here runs through the session-bound client from
// lib/supabase/server.ts — visibility (admin sees everything, member sees
// only what's assigned to them) is enforced by the RLS policies in
// supabase/migrations, not by any filtering in this file. That's deliberate:
// the same query a member's session runs here is the same query they'd get
// if they hit the table directly, so there's no separate "app-level" rule
// that could drift out of sync with the real security boundary.

export interface ListLeadsOpts {
  page: number;
  pageSize: number;
  status?: LeadStatus;
  assigned_to?: string;
  search?: string;
}

export async function listLeads(opts: ListLeadsOpts): Promise<Paginated<Lead>> {
  const supabase = await createClient();
  const from = (opts.page - 1) * opts.pageSize;
  const to = from + opts.pageSize - 1;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.status) query = query.eq("status", opts.status);
  if (opts.assigned_to) query = query.eq("assigned_to", opts.assigned_to);
  if (opts.search) {
    query = query.or(
      `name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,company.ilike.%${opts.search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data ?? [], page: opts.page, pageSize: opts.pageSize, total: count ?? 0 };
}

export async function getLead(id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// Public capture form path — no session, runs as the `anon` role. RLS's
// leads_public_insert policy is the entire security boundary here: it only
// grants INSERT with status='new' and assigned_to=null, nothing else.
// Deliberately does NOT request the row back (`.select()`) — anon has no
// SELECT grant, so asking PostgREST to return the inserted row fails even
// though the insert itself succeeds (verified directly against this project
// before writing this function — see the curl tests earlier in this build).
export async function createPublicLead(input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
}): Promise<void> {
  const supabase = await createClient();

  // Both of these run through security definer functions (see the
  // 20260726000003 migration) since anon has no SELECT grant on `leads` at
  // all - there's no way to check "does this exist already" with a direct
  // query the anon role could run.
  const { data: isDuplicate } = await supabase.rpc("check_duplicate_lead", {
    p_email: input.email,
    p_days: 7,
  });

  const { score, reason } = await scoreLead({
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
  });

  const { error } = await supabase.from("leads").insert({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    company: input.company || null,
    source: "public_form",
    possible_duplicate: !!isDuplicate,
    score,
    score_reason: reason,
  });
  if (error) throw error;

  // Best-effort - a failed notification never fails the capture itself.
  await notifyNewLead({
    name: input.name,
    email: input.email,
    company: input.company,
    score,
    possibleDuplicate: !!isDuplicate,
  });
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  actorId: string,
): Promise<Lead> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity(id, actorId, "status_changed", { status });
  return data;
}

// Admin-only in practice: leads_member_update_own's with-check doesn't touch
// assigned_to at all for a member's own update path (they can change status,
// not assignment), and there's no member-scoped policy granting them
// permission to write assigned_to on someone else's lead. A member calling
// this against a lead assigned to them still can't move it to someone else —
// Postgres just rejects the write, same as it would for any other row.
export async function assignLead(
  id: string,
  assignedTo: string | null,
  actorId: string,
): Promise<Lead> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_to: assignedTo })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity(id, actorId, "assigned", { assigned_to: assignedTo });
  return data;
}

// ─── Notes ──────────────────────────────────────────────────────────────────

export async function listNotes(leadId: string): Promise<LeadNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addNote(leadId: string, authorId: string, body: string): Promise<LeadNote> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: leadId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, authorId, "note_added", { note_id: data.id });
  return data;
}

// ─── Activity trail ─────────────────────────────────────────────────────────
// Written from the API layer on every mutation (status change, assignment,
// note add) rather than a DB trigger — faster to implement and test within
// this build's time budget. A trigger-based version would be more robust
// (can't be bypassed by a future write path that forgets to call this), and
// is the honest "if I had more time" answer — noted in the README, not
// silently glossed over.

export async function listActivity(leadId: string): Promise<LeadActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_activity")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Team-wide activity feed - no leadId filter, so RLS itself decides what
// comes back: an admin's session gets every event, a member's session gets
// only events on leads assigned to them (lead_activity_member_own_lead).
// No extra role check needed here - the same query run through two
// different sessions naturally returns two different result sets.
export async function listAllActivity(limit = 50): Promise<LeadActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

async function logActivity(
  leadId: string,
  actorId: string,
  action: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_activity")
    .insert({ lead_id: leadId, actor_id: actorId, action, meta });
  if (error) throw error;
}
