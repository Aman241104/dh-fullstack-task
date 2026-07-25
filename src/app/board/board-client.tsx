"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadNote, LeadActivity, Profile, LeadStatus, Paginated } from "@/lib/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-purple-100 text-purple-800",
  qualified: "bg-amber-100 text-amber-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-neutral-200 text-neutral-600",
};

export default function BoardClient({
  currentProfile,
  profiles,
}: {
  currentProfile: Profile;
  profiles: Profile[];
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  const pageSize = 20;
  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const data: Paginated<Lead> = await res.json();
      setLeads(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: LeadStatus) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads((ls) => ls.map((l) => (l.id === id ? updated : l)));
    }
  }

  async function assign(id: string, assignedTo: string | null) {
    const res = await fetch(`/api/leads/${id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads((ls) => ls.map((l) => (l.id === id ? updated : l)));
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Docket</h1>
          <p className="text-sm text-neutral-500">
            {currentProfile.name} · {currentProfile.role}
          </p>
        </div>
        <button onClick={signOut} className="text-sm text-neutral-500 hover:text-neutral-900">
          Sign out
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => {
            setStatusFilter("all");
            setPage(1);
          }}
          className={`text-xs px-3 py-1 rounded-full ${
            statusFilter === "all" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          All ({total})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`text-xs px-3 py-1 rounded-full capitalize ${
              statusFilter === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {s}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email, company…"
          className="ml-auto text-sm border border-neutral-300 rounded-md px-3 py-1.5 w-64"
        />
      </div>

      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Assigned to</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No leads found
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedId(lead.id)}
                className="hover:bg-neutral-50 cursor-pointer"
              >
                <td className="px-4 py-2 font-medium">{lead.name}</td>
                <td className="px-4 py-2 text-neutral-600">{lead.company || "—"}</td>
                <td className="px-4 py-2 text-neutral-600">{lead.email}</td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${STATUS_COLORS[lead.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  {currentProfile.role === "admin" ? (
                    <select
                      value={lead.assigned_to ?? ""}
                      onChange={(e) => assign(lead.id, e.target.value || null)}
                      className="text-xs border border-neutral-300 rounded px-2 py-1"
                    >
                      <option value="">Unassigned</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-neutral-600">
                      {lead.assigned_to ? profileById[lead.assigned_to]?.name ?? "—" : "Unassigned"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-400 text-xs">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-neutral-500">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selectedId && (
        <LeadDetail
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          currentProfile={currentProfile}
          profileById={profileById}
        />
      )}
    </main>
  );
}

function LeadDetail({
  leadId,
  onClose,
  currentProfile,
  profileById,
}: {
  leadId: string;
  onClose: () => void;
  currentProfile: Profile;
  profileById: Record<string, Profile>;
}) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [leadRes, notesRes, activityRes] = await Promise.all([
      fetch(`/api/leads/${leadId}`),
      fetch(`/api/leads/${leadId}/notes`),
      fetch(`/api/leads/${leadId}/activity`),
    ]);
    if (leadRes.ok) setLead(await leadRes.json());
    if (notesRes.ok) setNotes(await notesRes.json());
    if (activityRes.ok) setActivity(await activityRes.json());
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((n) => [...n, note]);
      setNewNote("");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold">{lead?.name}</h2>
            <p className="text-sm text-neutral-500">{lead?.email}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            ✕
          </button>
        </div>

        <div className="space-y-1 text-sm text-neutral-600 mb-6">
          <p>Company: {lead?.company || "—"}</p>
          <p>Phone: {lead?.phone || "—"}</p>
          <p>
            Assigned to:{" "}
            {lead?.assigned_to ? profileById[lead.assigned_to]?.name ?? "—" : "Unassigned"}
          </p>
        </div>

        <h3 className="text-sm font-semibold mb-2">Notes</h3>
        <div className="space-y-2 mb-4">
          {notes.length === 0 && <p className="text-sm text-neutral-400">No notes yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="bg-neutral-50 rounded-md p-3 text-sm">
              <p>{n.body}</p>
              <p className="text-xs text-neutral-400 mt-1">
                {profileById[n.author_id]?.name ?? "—"} · {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={addNote}
            disabled={saving}
            className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <h3 className="text-sm font-semibold mb-2">Activity</h3>
        <div className="space-y-2">
          {activity.length === 0 && <p className="text-sm text-neutral-400">No activity yet.</p>}
          {activity.map((a) => (
            <div key={a.id} className="text-xs text-neutral-500 flex justify-between">
              <span>
                {profileById[a.actor_id]?.name ?? "—"} — {a.action.replace(/_/g, " ")}
                {a.action === "status_changed" && typeof a.meta.status === "string"
                  ? ` → ${a.meta.status}`
                  : ""}
              </span>
              <span>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
