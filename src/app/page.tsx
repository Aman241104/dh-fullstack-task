"use client";

import { useState } from "react";
import { captureLeadSchema } from "@/lib/schemas";

export default function CapturePage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    website: "", // honeypot — stays empty for a real human, hidden via CSS below
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = captureLeadSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Submission failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold mb-2">Thanks — we&apos;ve got it.</h1>
        <p className="text-neutral-600">Someone from the team will be in touch shortly.</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-1">Talk to us</h1>
      <p className="text-neutral-600 mb-8 text-sm">
        Tell us a bit about what you need — we&apos;ll follow up shortly.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
          <input
            id="name"
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email *</label>
          <input
            id="email"
            type="email"
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium mb-1">Company</label>
          <input
            id="company"
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
          <input
            id="phone"
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1">What do you need?</label>
          <textarea
            id="message"
            rows={3}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </div>
        {/* Honeypot — visually hidden, not display:none/type=hidden (those are the
            first things a scraping bot filters out; off-screen positioning survives
            more naive bots). A real user never sees or fills this in. */}
        <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-neutral-900 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {status === "submitting" ? "Sending…" : "Send"}
        </button>
        {status === "error" && (
          <p className="text-red-600 text-sm">Something went wrong — try again.</p>
        )}
      </form>
    </main>
  );
}
