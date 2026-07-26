import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
const memberEmail = process.env.TEST_MEMBER_EMAIL;
const memberPassword = process.env.TEST_MEMBER_PASSWORD;

const hasCreds = !!url && !!anonKey && !!adminEmail && !!adminPassword && !!memberEmail && !!memberPassword;

describe.skipIf(!hasCreds)("Core flows — real project, real sessions", () => {
  let anon: SupabaseClient;
  let adminClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let memberId: string;
  const cleanupEmails: string[] = [];

  beforeAll(async () => {
    anon = createClient(url!, anonKey!);

    adminClient = createClient(url!, anonKey!);
    const { error: adminErr } = await adminClient.auth.signInWithPassword({
      email: adminEmail!,
      password: adminPassword!,
    });
    if (adminErr) throw adminErr;

    memberClient = createClient(url!, anonKey!);
    const { data: memberAuth, error: memberErr } = await memberClient.auth.signInWithPassword({
      email: memberEmail!,
      password: memberPassword!,
    });
    if (memberErr) throw memberErr;
    memberId = memberAuth.user!.id;
  });

  afterAll(async () => {
    for (const email of cleanupEmails) {
      await adminClient.from("leads").delete().eq("email", email);
    }
    await anon.auth.signOut();
    await adminClient.auth.signOut();
    await memberClient.auth.signOut();
  });

  // ── Flow 1: public capture → visible to admin, invisible to a stranger ──
  it("a public form submission becomes a real, admin-visible lead with status new", async () => {
    const email = "test-flow1@example.com";
    cleanupEmails.push(email);

    const { error: insertError } = await anon.from("leads").insert({
      name: "TEST_flow1_capture",
      email,
      company: "Flow One Corp",
    });
    expect(insertError).toBeNull();

    const { data, error } = await adminClient.from("leads").select("*").eq("email", email).single();
    expect(error).toBeNull();
    expect(data.status).toBe("new");
    expect(data.assigned_to).toBeNull();
    expect(data.source).toBe("public_form");
  });

  // ── Flow 2: assign -> status change -> note -> activity trail records all three, in order ──
  it("assigning, updating status, and adding a note all land in the activity trail correctly", async () => {
    const email = "test-flow2@example.com";
    cleanupEmails.push(email);

    const { data: lead, error: createErr } = await adminClient
      .from("leads")
      .insert({ name: "TEST_flow2_lifecycle", email })
      .select()
      .single();
    if (createErr) throw createErr;

    // Admin assigns to the member.
    const { error: assignErr } = await adminClient
      .from("leads")
      .update({ assigned_to: memberId })
      .eq("id", lead.id);
    expect(assignErr).toBeNull();
    await adminClient.from("lead_activity").insert({
      lead_id: lead.id,
      actor_id: (await adminClient.auth.getUser()).data.user!.id,
      action: "assigned",
      meta: { assigned_to: memberId },
    });

    // Member (now able to see it) moves it to contacted.
    const { error: statusErr } = await memberClient
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", lead.id);
    expect(statusErr).toBeNull();
    await memberClient.from("lead_activity").insert({
      lead_id: lead.id,
      actor_id: memberId,
      action: "status_changed",
      meta: { status: "contacted" },
    });

    // Member adds a note.
    const { data: note, error: noteErr } = await memberClient
      .from("lead_notes")
      .insert({ lead_id: lead.id, author_id: memberId, body: "TEST_flow2 note body" })
      .select()
      .single();
    expect(noteErr).toBeNull();
    await memberClient.from("lead_activity").insert({
      lead_id: lead.id,
      actor_id: memberId,
      action: "note_added",
      meta: { note_id: note.id },
    });

    // Verify final state and the full activity trail, oldest first.
    const { data: finalLead } = await adminClient.from("leads").select("*").eq("id", lead.id).single();
    expect(finalLead.status).toBe("contacted");
    expect(finalLead.assigned_to).toBe(memberId);

    const { data: activity } = await adminClient
      .from("lead_activity")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true });
    expect(activity?.map((a) => a.action)).toEqual(["assigned", "status_changed", "note_added"]);
  });
});
