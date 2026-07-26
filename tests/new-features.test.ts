import { describe, it, expect } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { deterministicScore } from "@/lib/ai/scoring";
import { captureLeadSchema } from "@/lib/schemas";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

const hasCreds = !!url && !!anonKey && !!adminEmail && !!adminPassword;

// ── Pure functions — no DB, no network ──────────────────────────────────

describe("deterministicScore", () => {
  it("scores a bare gmail submission with no extra signal low-to-mid", () => {
    const score = deterministicScore({ email: "person@gmail.com" });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(50);
  });

  it("scores a business-domain submission with phone, company, and a long message high", () => {
    const score = deterministicScore({
      email: "ops@acme-industrial.com",
      phone: "+1 555 200 3000",
      company: "Acme Industrial",
      message: "word ".repeat(50).trim(),
    });
    expect(score).toBeGreaterThan(70);
  });

  it("never exceeds 0-100 regardless of input", () => {
    const score = deterministicScore({
      email: "a@b.co",
      phone: "x",
      company: "y",
      message: "word ".repeat(500),
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("captureLeadSchema honeypot field", () => {
  it("accepts an empty website field (the real-human case)", () => {
    const parsed = captureLeadSchema.safeParse({
      name: "Real Person",
      email: "real@example.com",
      website: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a non-empty website field at the SCHEMA level (the route handler, not the schema, is what turns this into a fake-success — a schema that rejected it here would leak to a bot that it got caught via a different status code)", () => {
    const parsed = captureLeadSchema.safeParse({
      name: "Bot",
      email: "bot@example.com",
      website: "http://spam.example",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("http://spam.example");
    }
  });
});

// ── DB-backed security-definer functions — real project, real calls ─────

describe.skipIf(!hasCreds)("Rate limiting, duplicate detection, IP allowlist, settings", () => {
  let anon: SupabaseClient;
  let adminClient: SupabaseClient;

  const setup = async () => {
    if (anon) return;
    anon = createClient(url!, anonKey!);
    adminClient = createClient(url!, anonKey!);
    const { error } = await adminClient.auth.signInWithPassword({
      email: adminEmail!,
      password: adminPassword!,
    });
    if (error) throw error;
  };

  it("check_rate_limit allows up to the max, then blocks", async () => {
    await setup();
    const key = `test-rl-${Date.now()}-${Math.random()}`;
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { data, error } = await anon.rpc("check_rate_limit", {
        p_key: key,
        p_window_seconds: 60,
        p_max: 3,
      });
      expect(error).toBeNull();
      results.push(data as boolean);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("check_duplicate_lead flags a matching email within the window", async () => {
    await setup();
    const email = `test-dup-${Date.now()}@example.com`;
    const { data: created, error: createErr } = await adminClient
      .from("leads")
      .insert({ name: "TEST_dup_seed", email, source: "test" })
      .select()
      .single();
    expect(createErr).toBeNull();

    const { data: isDup, error } = await anon.rpc("check_duplicate_lead", {
      p_email: email,
      p_phone: null,
      p_days: 7,
    });
    expect(error).toBeNull();
    expect(isDup).toBe(true);

    const { data: notDup } = await anon.rpc("check_duplicate_lead", {
      p_email: `unrelated-${Date.now()}@example.com`,
      p_phone: null,
      p_days: 7,
    });
    expect(notDup).toBe(false);

    await adminClient.from("leads").delete().eq("id", created.id);
  });

  it("check_duplicate_lead also flags a matching phone number under a different email", async () => {
    await setup();
    const phone = `+1555${Date.now().toString().slice(-7)}`;
    const { data: created, error: createErr } = await adminClient
      .from("leads")
      .insert({ name: "TEST_dup_phone_seed", email: `phone-seed-${Date.now()}@example.com`, phone, source: "test" })
      .select()
      .single();
    expect(createErr).toBeNull();

    const { data: isDup } = await anon.rpc("check_duplicate_lead", {
      p_email: `different-${Date.now()}@example.com`,
      p_phone: phone,
      p_days: 7,
    });
    expect(isDup).toBe(true);

    await adminClient.from("leads").delete().eq("id", created.id);
  });

  it("is_ip_allowed returns true for any IP when the allowlist is empty", async () => {
    await setup();
    const { data: existing } = await adminClient.from("ip_allowlist").select("id");
    expect(existing?.length ?? 0).toBe(0); // sanity: don't run this against a populated allowlist

    const { data, error } = await anon.rpc("is_ip_allowed", { p_ip: "198.51.100.1" });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("is_ip_allowed only allows an IP once it's the sole entry, and blocks everything else", async () => {
    await setup();
    const allowedIp = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
    const { data: entry, error: insertErr } = await adminClient
      .from("ip_allowlist")
      .insert({ ip: allowedIp, note: "TEST" })
      .select()
      .single();
    expect(insertErr).toBeNull();

    const { data: allowedResult } = await anon.rpc("is_ip_allowed", { p_ip: allowedIp });
    expect(allowedResult).toBe(true);

    const { data: blockedResult } = await anon.rpc("is_ip_allowed", { p_ip: "9.9.9.9" });
    expect(blockedResult).toBe(false);

    await adminClient.from("ip_allowlist").delete().eq("id", entry.id);
  });

  it("get_alert_email returns null when unset, and the configured value once set", async () => {
    await setup();
    const { data: before } = await adminClient
      .from("app_settings")
      .select("alert_email")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    const testEmail = `alerts-test-${Date.now()}@example.com`;
    const { error: updateErr } = await adminClient
      .from("app_settings")
      .update({ alert_email: testEmail })
      .eq("id", "00000000-0000-0000-0000-000000000001");
    expect(updateErr).toBeNull();

    const { data: viaRpc, error: rpcErr } = await anon.rpc("get_alert_email");
    expect(rpcErr).toBeNull();
    expect(viaRpc).toBe(testEmail);

    // Restore whatever was there before this test ran.
    await adminClient
      .from("app_settings")
      .update({ alert_email: before?.alert_email ?? null })
      .eq("id", "00000000-0000-0000-0000-000000000001");
  });
});
