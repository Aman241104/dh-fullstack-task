import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Real integration tests against the actual live Supabase project — same
// pattern as whatsapp-agents' rls-tenant-isolation.test.ts: no mocking, the
// exact anon key and the exact demo sessions a real client would use. This
// is what "automated tests covering auth rules" means in practice: proving
// the RLS policies actually behave as claimed, not asserting that a mocked
// function was called.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
const memberEmail = process.env.TEST_MEMBER_EMAIL;
const memberPassword = process.env.TEST_MEMBER_PASSWORD;

const hasCreds = !!url && !!anonKey && !!adminEmail && !!adminPassword && !!memberEmail && !!memberPassword;

describe.skipIf(!hasCreds)("Auth rules — real project, real sessions", () => {
  let anon: SupabaseClient;
  let adminClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let adminId: string;
  let memberId: string;
  let adminOwnedLeadId: string;
  let memberOwnedLeadId: string;

  beforeAll(async () => {
    anon = createClient(url!, anonKey!);

    adminClient = createClient(url!, anonKey!);
    const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
      email: adminEmail!,
      password: adminPassword!,
    });
    if (adminErr) throw adminErr;
    adminId = adminAuth.user!.id;

    memberClient = createClient(url!, anonKey!);
    const { data: memberAuth, error: memberErr } = await memberClient.auth.signInWithPassword({
      email: memberEmail!,
      password: memberPassword!,
    });
    if (memberErr) throw memberErr;
    memberId = memberAuth.user!.id;

    // Two leads set up as fixtures: one assigned to the member, one
    // unassigned (admin-only visible). Created via the admin session so RLS
    // doesn't get in the way of the setup itself.
    const { data: memberLead, error: e1 } = await adminClient
      .from("leads")
      .insert({ name: "TEST_member_owned", email: "test-member-owned@example.com" })
      .select()
      .single();
    if (e1) throw e1;
    memberOwnedLeadId = memberLead.id;
    await adminClient.from("leads").update({ assigned_to: memberId }).eq("id", memberOwnedLeadId);

    const { data: adminLead, error: e2 } = await adminClient
      .from("leads")
      .insert({ name: "TEST_admin_owned_unassigned", email: "test-admin-owned@example.com" })
      .select()
      .single();
    if (e2) throw e2;
    adminOwnedLeadId = adminLead.id;
  });

  afterAll(async () => {
    // Clean up — admin can delete via leads_admin_all's "for all" policy.
    await adminClient.from("leads").delete().eq("id", memberOwnedLeadId);
    await adminClient.from("leads").delete().eq("id", adminOwnedLeadId);
    await anon.auth.signOut();
    await adminClient.auth.signOut();
    await memberClient.auth.signOut();
  });

  it("anon can INSERT a public lead (the capture form's real path)", async () => {
    const { error } = await anon
      .from("leads")
      .insert({ name: "TEST_anon_capture", email: "test-anon@example.com" });
    expect(error).toBeNull();
    // Clean up this one via admin, since anon itself can't read it back to confirm.
    await adminClient.from("leads").delete().eq("email", "test-anon@example.com");
  });

  it("anon CANNOT read any leads at all", async () => {
    const { data } = await anon.from("leads").select("*");
    expect(data ?? []).toHaveLength(0);
  });

  it("anon CANNOT insert a lead that's pre-assigned or pre-qualified (with-check blocks it)", async () => {
    const { error } = await anon
      .from("leads")
      .insert({ name: "TEST_anon_cheat", email: "test-cheat@example.com", status: "qualified" });
    expect(error).not.toBeNull();
  });

  it("admin CAN read every lead, including ones assigned to someone else", async () => {
    const { data, error } = await adminClient.from("leads").select("*").eq("id", memberOwnedLeadId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("member CAN read a lead assigned to them", async () => {
    const { data, error } = await memberClient.from("leads").select("*").eq("id", memberOwnedLeadId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("member CANNOT read a lead assigned to someone else (or unassigned)", async () => {
    const { data } = await memberClient.from("leads").select("*").eq("id", adminOwnedLeadId);
    expect(data ?? []).toHaveLength(0);
  });

  it("member CANNOT reassign a lead, even one assigned to them", async () => {
    const { error } = await memberClient
      .from("leads")
      .update({ assigned_to: adminId })
      .eq("id", memberOwnedLeadId);
    // RLS silently returns 0 rows affected rather than an error for an
    // update whose with-check fails on every candidate row — assert on the
    // real effect (assignment unchanged), not just presence of an error.
    const { data: check } = await adminClient
      .from("leads")
      .select("assigned_to")
      .eq("id", memberOwnedLeadId)
      .single();
    expect(check?.assigned_to).toBe(memberId);
  });

  it("member CAN update the status of a lead assigned to them", async () => {
    const { error } = await memberClient
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", memberOwnedLeadId);
    expect(error).toBeNull();
    const { data: check } = await adminClient
      .from("leads")
      .select("status")
      .eq("id", memberOwnedLeadId)
      .single();
    expect(check?.status).toBe("contacted");
  });
});
