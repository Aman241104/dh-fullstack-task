"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Trash, Globe, Plus, Bell, Check } from "@phosphor-icons/react";
import Sidebar from "@/components/sidebar";
import MobileTopBar from "@/components/mobile-top-bar";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface TotpFactor {
  id: string;
  status: string;
  friendly_name?: string;
}

interface AllowlistEntry {
  id: string;
  ip: string;
  note: string | null;
  created_at: string;
}

// Uses Supabase Auth's native TOTP MFA — no third-party 2FA service. Enroll
// returns a QR code (as raw SVG markup, wrapped into a data URI before use)
// plus the raw secret for manual entry; a factor only becomes `verified`
// after one successful code check,
// which is what actually raises the account's required assurance level to
// aal2 on future logins (see the login page's post-password MFA check).
export default function SettingsClient({ currentProfile }: { currentProfile: Profile }) {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newNote, setNewNote] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [savedAlertEmail, setSavedAlertEmail] = useState(false);

  const loadSettings = useCallback(async () => {
    if (currentProfile.role !== "admin") return;
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      setAlertEmail(data.alert_email ?? "");
    }
  }, [currentProfile.role]);

  useEffect(() => {
    // See the equivalent comment in board-client.tsx - queueMicrotask
    // avoids the react-hooks/set-state-in-effect lint error without
    // changing when this actually runs.
    queueMicrotask(() => {
      loadSettings();
    });
  }, [loadSettings]);

  async function saveAlertEmail() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_email: alertEmail.trim() }),
    });
    if (res.ok) {
      setSavedAlertEmail(true);
      setTimeout(() => setSavedAlertEmail(false), 2000);
    }
  }

  const loadAllowlist = useCallback(async () => {
    if (currentProfile.role !== "admin") return;
    const res = await fetch("/api/ip-allowlist");
    if (res.ok) setAllowlist(await res.json());
  }, [currentProfile.role]);

  useEffect(() => {
    queueMicrotask(() => {
      loadAllowlist();
    });
  }, [loadAllowlist]);

  async function addAllowlistEntry() {
    if (!newIp.trim()) return;
    const res = await fetch("/api/ip-allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: newIp.trim(), note: newNote.trim() }),
    });
    if (res.ok) {
      setNewIp("");
      setNewNote("");
      await loadAllowlist();
    }
  }

  async function removeAllowlistEntry(id: string) {
    const res = await fetch(`/api/ip-allowlist/${id}`, { method: "DELETE" });
    if (res.ok) await loadAllowlist();
  }

  const loadFactors = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as TotpFactor[]);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadFactors();
    });
  }, [loadFactors]);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not start enrollment");
      return;
    }
    setFactorId(data.id);
    // Supabase's qr_code is sometimes raw SVG markup, sometimes already a
    // data URI (despite their own docs showing it passed directly to
    // <Image src>, which only works for the latter case) - only wrap it
    // when it isn't one already, to avoid double-encoding.
    const rawQr = data.totp.qr_code;
    setQrCode(rawQr.startsWith("data:") ? rawQr : `data:image/svg+xml;utf8,${encodeURIComponent(rawQr)}`);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function verifyEnroll() {
    if (!factorId) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    await loadFactors();
  }

  async function removeFactor(id: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    await loadFactors();
  }

  return (
    <div className="min-h-screen p-4 sm:p-5 flex flex-col lg:flex-row gap-5 max-w-[1400px] mx-auto">
      <Sidebar currentProfile={currentProfile} />
      <MobileTopBar currentProfile={currentProfile} />

      <main className="flex-1 min-w-0 max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm mb-6">Account security.</p>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
            <ShieldCheck size={16} /> Two-factor authentication
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Require a code from an authenticator app when signing in.
          </p>

          {factors.filter((f) => f.status === "verified").map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between bg-card-muted rounded-xl px-3 py-2.5 mb-2 text-sm"
            >
              <span>Authenticator app enabled</span>
              <button
                onClick={() => removeFactor(f.id)}
                disabled={busy}
                className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
                title="Remove"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}

          {factors.filter((f) => f.status === "verified").length === 0 && !enrolling && (
            <>
              <button
                onClick={startEnroll}
                disabled={busy}
                className="bg-accent text-accent-foreground text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
              >
                Enable 2FA
              </button>
              {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            </>
          )}

          {enrolling && (
            <div className="space-y-3">
              {qrCode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCode} alt="Scan with your authenticator app" className="w-40 h-40 rounded-lg border border-border" />
              )}
              {secret && (
                <p className="text-xs text-muted-foreground break-all">
                  Manual entry key: <span className="font-mono">{secret}</span>
                </p>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                maxLength={6}
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-card-muted focus:outline-none"
              />
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={verifyEnroll}
                  disabled={busy || code.length < 6}
                  className="bg-accent text-accent-foreground text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setEnrolling(false);
                    setQrCode(null);
                    setSecret(null);
                    setFactorId(null);
                    setCode("");
                  }}
                  className="text-sm text-muted-foreground px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {currentProfile.role === "admin" && (
          <div className="bg-card rounded-2xl border border-border p-5 mt-5">
            <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Bell size={16} /> Lead alert email
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Where new-lead notifications are sent. Falls back to the deployment default when
              unset.
            </p>
            <div className="flex gap-2">
              <input
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card-muted focus:outline-none"
              />
              <button
                onClick={saveAlertEmail}
                className="bg-accent text-accent-foreground text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                {savedAlertEmail ? <Check size={14} /> : null}
                {savedAlertEmail ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        )}

        {currentProfile.role === "admin" && (
          <div className="bg-card rounded-2xl border border-border p-5 mt-5">
            <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Globe size={16} /> IP allowlist
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Empty means unrestricted. Add an entry to start restricting access to the pipeline
              by IP — /settings itself always stays reachable.
            </p>

            <div className="space-y-2 mb-4">
              {allowlist.length === 0 && (
                <p className="text-xs text-muted-foreground">No restrictions — everyone can access.</p>
              )}
              {allowlist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between bg-card-muted rounded-xl px-3 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-mono">{entry.ip}</span>
                    {entry.note && <span className="text-muted-foreground ml-2 text-xs">{entry.note}</span>}
                  </div>
                  <button
                    onClick={() => removeAllowlistEntry(entry.id)}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="IP address"
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card-muted focus:outline-none font-mono"
              />
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Note (optional)"
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card-muted focus:outline-none"
              />
              <button
                onClick={addAllowlistEntry}
                className="bg-accent text-accent-foreground rounded-xl px-3 py-2"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
