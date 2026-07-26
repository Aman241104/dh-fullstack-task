"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Password auth alone only gets an aal1 session — if this account has a
    // TOTP factor enrolled, Supabase requires an aal2 challenge before the
    // session is fully authenticated. This is native Supabase Auth MFA, not
    // a bolted-on check: currentLevel/nextLevel mismatch is how the SDK
    // signals a pending challenge.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.[0];
      setLoading(false);
      if (factor) {
        setMfaFactorId(factor.id);
        return;
      }
    }

    setLoading(false);
    router.replace("/board");
    router.refresh();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: mfaFactorId,
    });
    if (challengeError || !challenge) {
      setLoading(false);
      setError(challengeError?.message ?? "Could not start verification");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode,
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.replace("/board");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
            D
          </div>
          <span className="font-bold text-lg tracking-tight">Docket.</span>
        </div>

        {!mfaFactorId ? (
          <>
            <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground mb-6">Sign in to your pipeline.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-card-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-card-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-accent-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1">Two-factor verification</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the 6-digit code from your authenticator app.
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium mb-1.5">
                  Code
                </label>
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  maxLength={6}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-card-muted focus:outline-none focus:ring-2 focus:ring-accent/30 tracking-widest"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-accent-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
