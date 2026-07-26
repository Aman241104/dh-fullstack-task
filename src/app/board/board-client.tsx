"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Bell,
  MagnifyingGlass,
  Buildings,
  Phone,
  EnvelopeSimple,
  UsersFour,
  Sparkle,
  Trophy,
  ChartLineUp,
  X,
  SquaresFour,
  Kanban,
  DownloadSimple,
  Clock,
  Robot,
  PaperPlaneRight,
} from "@phosphor-icons/react";
import Sidebar from "@/components/sidebar";
import MobileTopBar from "@/components/mobile-top-bar";
import StatCard from "@/components/stat-card";
import KanbanBoard from "@/components/kanban-board";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadNote, LeadActivity, Profile, LeadStatus, Paginated } from "@/lib/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-600",
  contacted: "bg-violet-50 text-violet-600",
  qualified: "bg-amber-50 text-amber-600",
  won: "bg-emerald-50 text-emerald-600",
  lost: "bg-neutral-100 text-neutral-500",
};

const AVATAR_PALETTE = [
  "bg-blue-50 text-blue-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
  "bg-cyan-50 text-cyan-600",
];

function avatarStyle(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash + ch.charCodeAt(0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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
  const [assignedFilter, setAssignedFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, won: 0, unassigned: 0 });
  const [view, setView] = useState<"grid" | "kanban">("grid");
  const [showActivity, setShowActivity] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);

  const pageSize = view === "kanban" ? 100 : 9;
  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (assignedFilter !== "all") params.set("assigned_to", assignedFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const data: Paginated<Lead> = await res.json();
      setLeads(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, pageSize, statusFilter, assignedFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStats = useCallback(() => {
    fetch(`/api/leads?pageSize=100`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Paginated<Lead> | null) => {
        if (!data) return;
        setStats({
          total: data.total,
          won: data.data.filter((l) => l.status === "won").length,
          unassigned: data.data.filter((l) => !l.assigned_to).length,
        });
      });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Realtime: any insert/update/delete on `leads` refreshes the board and
  // the stat strip, scoped by whatever RLS already grants this session -
  // a member's subscription simply never receives events for rows they
  // can't see, since Realtime is also RLS-gated on this project.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        load();
        loadStats();
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 1200);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, loadStats]);

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

  function exportCsv() {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (assignedFilter !== "all") params.set("assigned_to", assignedFilter);
    if (search) params.set("search", search);
    window.open(`/api/leads/export?${params}`, "_blank");
  }

  return (
    <div className="min-h-screen p-4 sm:p-5 flex flex-col lg:flex-row gap-5 max-w-[1400px] mx-auto">
      <Sidebar currentProfile={currentProfile} />
      <MobileTopBar currentProfile={currentProfile} />

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Welcome, {currentProfile.name.split(" ")[0]}!
              {liveFlash && (
                <span className="text-xs font-medium text-accent bg-accent-soft px-2 py-1 rounded-full animate-pulse">
                  live update
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Here&apos;s what&apos;s happening with your pipeline today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowActivity(true)}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Team activity"
            >
              <Bell size={18} />
            </button>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${avatarStyle(currentProfile.id)}`}>
              {initials(currentProfile.name)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total leads" value={stats.total} icon={UsersFour} />
          <StatCard label="Won" value={stats.won} icon={Trophy} />
          <StatCard label="Unassigned" value={stats.unassigned} icon={Sparkle} />
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as LeadStatus | "all");
                setPage(1);
              }}
              className="text-sm bg-transparent font-medium focus:outline-none"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-px h-8 bg-border" />
          {currentProfile.role === "admin" && (
            <>
              <div>
                <label className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                  Assigned to
                </label>
                <select
                  value={assignedFilter}
                  onChange={(e) => {
                    setAssignedFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-sm bg-transparent font-medium focus:outline-none"
                >
                  <option value="all">Everyone</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-px h-8 bg-border" />
            </>
          )}
          <div className="flex-1 flex items-center gap-2 min-w-[200px]">
            <MagnifyingGlass size={16} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, company…"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:text-foreground"
          >
            <DownloadSimple size={14} /> Export CSV
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Leads</h2>
            <span className="text-xs text-muted-foreground bg-card-muted px-2.5 py-1 rounded-full">
              {total}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-card-muted rounded-lg p-1">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md ${view === "grid" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              <SquaresFour size={14} /> Grid
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md ${view === "kanban" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              <Kanban size={14} /> Kanban
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}
        {!loading && leads.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No leads found.</p>
        )}

        {!loading && leads.length > 0 && view === "kanban" && (
          <KanbanBoard
            leads={leads}
            profileById={profileById}
            onStatusChange={updateStatus}
            onSelectLead={setSelectedId}
          />
        )}

        {!loading && leads.length > 0 && view === "grid" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarStyle(lead.id)}`}
                      >
                        {initials(lead.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.company || "No company"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLES[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <EnvelopeSimple size={13} />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} />
                        {lead.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Buildings size={13} />
                      {lead.assigned_to ? profileById[lead.assigned_to]?.name ?? "—" : "Unassigned"}
                    </div>
                    {lead.score !== null && (
                      <div className="flex items-center gap-1.5">
                        <Sparkle size={13} />
                        Score: {lead.score}/100
                      </div>
                    )}
                  </div>

                  {lead.possible_duplicate && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit">
                      Possible duplicate
                    </span>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                      className="text-xs border border-border rounded-lg px-2 py-1.5 flex-1 bg-card-muted"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                          {s}
                        </option>
                      ))}
                    </select>
                    {currentProfile.role === "admin" && (
                      <select
                        value={lead.assigned_to ?? ""}
                        onChange={(e) => assign(lead.id, e.target.value || null)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 flex-1 bg-card-muted"
                      >
                        <option value="">Unassigned</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => setSelectedId(lead.id)}
                      className="bg-accent text-accent-foreground text-xs font-medium px-3.5 py-1.5 rounded-lg whitespace-nowrap"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
              <span>
                Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40 bg-card"
                >
                  Prev
                </button>
                <button
                  disabled={page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40 bg-card"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {selectedId && (
        <LeadDetail
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          currentProfile={currentProfile}
          profileById={profileById}
        />
      )}

      {showActivity && (
        <ActivityFeed onClose={() => setShowActivity(false)} profileById={profileById} />
      )}
    </div>
  );
}

function ActivityFeed({
  onClose,
  profileById,
}: {
  onClose: () => void;
  profileById: Record<string, Profile>;
}) {
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setActivity(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md h-full overflow-y-auto p-6 rounded-l-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock size={18} /> Team activity
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-muted"
          >
            <X size={16} />
          </button>
        </div>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && activity.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        )}
        <div className="space-y-3">
          {activity.map((a) => (
            <div key={a.id} className="bg-card-muted rounded-xl p-3 text-sm">
              <p>
                <span className="font-medium">{profileById[a.actor_id]?.name ?? "—"}</span>
                {" — "}
                {a.action.replace(/_/g, " ")}
                {a.action === "status_changed" && typeof a.meta.status === "string"
                  ? ` → ${a.meta.status}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

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

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    const history = chat;
    setChat((c) => [...c, { role: "user", content: text }]);
    setChatInput("");
    setChatSending(true);
    const res = await fetch(`/api/leads/${leadId}/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });
    if (res.ok) {
      const data = await res.json();
      setChat((c) => [...c, { role: "assistant", content: data.reply }]);
      if (data.actions?.length > 0) load();
    } else {
      setChat((c) => [...c, { role: "assistant", content: "Something went wrong — try again." }]);
    }
    setChatSending(false);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md h-full overflow-y-auto p-6 rounded-l-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${avatarStyle(lead?.id ?? "x")}`}
            >
              {lead ? initials(lead.name) : ""}
            </div>
            <div>
              <h2 className="text-lg font-bold">{lead?.name}</h2>
              <p className="text-sm text-muted-foreground">{lead?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="bg-card-muted rounded-2xl p-4 space-y-2 text-sm mb-6">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Company</span>
            <span className="font-medium">{lead?.company || "—"}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{lead?.phone || "—"}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Assigned to</span>
            <span className="font-medium">
              {lead?.assigned_to ? profileById[lead.assigned_to]?.name ?? "—" : "Unassigned"}
            </span>
          </p>
          {lead?.score !== null && lead?.score !== undefined && (
            <p className="flex justify-between">
              <span className="text-muted-foreground">Score</span>
              <span className="font-medium">
                {lead.score}/100 {lead.score_reason ? `— ${lead.score_reason}` : ""}
              </span>
            </p>
          )}
          {lead?.possible_duplicate && (
            <div className="flex items-center justify-between bg-amber-50 rounded-md px-2 py-1.5 gap-2">
              <p className="text-amber-600 text-xs font-medium">
                Possible duplicate of an existing lead
              </p>
              <button
                onClick={async () => {
                  const res = await fetch(`/api/leads/${leadId}/dismiss-duplicate`, { method: "POST" });
                  if (res.ok) load();
                }}
                className="text-amber-700 text-xs font-medium underline whitespace-nowrap"
              >
                Not a duplicate
              </button>
            </div>
          )}
        </div>

        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
          <ChartLineUp size={15} /> Notes
        </h3>
        <div className="space-y-2 mb-4">
          {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="bg-card-muted rounded-xl p-3 text-sm">
              <p>{n.body}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
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
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card-muted focus:outline-none"
          />
          <button
            onClick={addNote}
            disabled={saving}
            className="bg-accent text-accent-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <h3 className="text-sm font-bold mb-3">Activity</h3>
        <div className="space-y-2 mb-6">
          {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {activity.map((a) => (
            <div key={a.id} className="text-xs text-muted-foreground flex justify-between">
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

        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
          <Robot size={15} /> Copilot
        </h3>
        <div className="bg-card-muted rounded-2xl p-3 space-y-2 mb-3 max-h-56 overflow-y-auto">
          {chat.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ask me to add a note, change status, assign this lead, or summarize it.
            </p>
          )}
          {chat.map((m, i) => (
            <div
              key={i}
              className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${
                m.role === "user" ? "bg-accent text-accent-foreground ml-auto" : "bg-card"
              }`}
            >
              {m.content}
            </div>
          ))}
          {chatSending && <p className="text-xs text-muted-foreground">Thinking…</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat();
            }}
            placeholder="e.g. mark as qualified and add a note that they called back"
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card-muted focus:outline-none"
          />
          <button
            onClick={sendChat}
            disabled={chatSending}
            className="bg-accent text-accent-foreground rounded-xl px-3 py-2 disabled:opacity-50"
          >
            <PaperPlaneRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
