import { nvidiaChat, isAiConfigured } from "./nvidia";
import { COPILOT_TOOLS } from "./copilotTools";
import {
  getLead,
  listProfiles,
  listNotes,
  listActivity,
  addNote,
  updateLeadStatus,
  assignLead,
} from "@/lib/leads";
import type { LeadStatus } from "@/lib/types";

export interface CopilotAction {
  tool: string;
  ok: boolean;
  detail: string;
}

export interface CopilotResult {
  reply: string;
  actions: CopilotAction[];
}

// Every tool handler below calls straight into lib/leads.ts — the same
// RLS-scoped functions the rest of the app uses. There is no service_role
// shortcut for the AI layer: if a member's session asks the Copilot to
// reassign a lead they don't own, Postgres rejects the write exactly as it
// would a manual API call, and that surfaces here as a failed action, not a
// bypass.
async function runTool(
  name: string,
  args: Record<string, unknown>,
  leadId: string,
  actorId: string,
): Promise<CopilotAction> {
  try {
    switch (name) {
      case "add_note": {
        const body = String(args.body ?? "").trim();
        if (!body) return { tool: name, ok: false, detail: "Note body was empty." };
        await addNote(leadId, actorId, body);
        return { tool: name, ok: true, detail: `Added note: "${body}"` };
      }
      case "update_status": {
        const status = args.status as LeadStatus;
        await updateLeadStatus(leadId, status, actorId);
        return { tool: name, ok: true, detail: `Status set to ${status}.` };
      }
      case "assign_lead": {
        const assignedTo = args.assigned_to === null ? null : String(args.assigned_to);
        const profiles = await listProfiles();
        const target = assignedTo ? profiles.find((p) => p.id === assignedTo) : null;
        await assignLead(leadId, assignedTo, actorId);
        return {
          tool: name,
          ok: true,
          detail: assignedTo ? `Assigned to ${target?.name ?? assignedTo}.` : "Unassigned.",
        };
      }
      case "summarize_lead": {
        const [lead, notes, activity] = await Promise.all([
          getLead(leadId),
          listNotes(leadId),
          listActivity(leadId),
        ]);
        if (!lead) return { tool: name, ok: false, detail: "Lead not found." };
        const summary = await summarize(lead, notes, activity);
        return { tool: name, ok: true, detail: summary };
      }
      default:
        return { tool: name, ok: false, detail: `Unknown tool: ${name}` };
    }
  } catch (e) {
    // A blocked write (RLS) or any other failure is reported back as a
    // failed action, not thrown — one tool call failing shouldn't take down
    // the whole Copilot turn.
    return { tool: name, ok: false, detail: (e as Error).message };
  }
}

async function summarize(
  lead: { name: string; status: string; company: string | null },
  notes: { body: string }[],
  activity: { action: string }[],
): Promise<string> {
  const fallback = `${lead.name} (${lead.company ?? "no company"}) — status: ${lead.status}, ${notes.length} note(s), ${activity.length} activity event(s).`;
  if (!isAiConfigured()) return fallback;

  const context = [
    `Lead: ${lead.name}, company: ${lead.company ?? "none"}, status: ${lead.status}`,
    `Notes: ${notes.map((n) => `- ${n.body}`).join("\n") || "none"}`,
    `Activity: ${activity.map((a) => `- ${a.action}`).join("\n") || "none"}`,
  ].join("\n");

  try {
    const message = await nvidiaChat(
      [
        {
          role: "user",
          content: `Summarize this sales lead's history in 2-3 short sentences for a busy salesperson.\n\n${context}`,
        },
      ],
      { maxTokens: 150, temperature: 0.3 },
    );
    return message.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export interface CopilotHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export async function runCopilotTurn(
  leadId: string,
  actorId: string,
  userMessage: string,
  history: CopilotHistoryTurn[] = [],
): Promise<CopilotResult> {
  if (!isAiConfigured()) {
    return {
      reply: "The AI Copilot isn't configured (missing NVIDIA_API_KEY) — I can't process that right now.",
      actions: [],
    };
  }

  const [lead, profiles] = await Promise.all([getLead(leadId), listProfiles()]);
  if (!lead) {
    return { reply: "I can't find that lead.", actions: [] };
  }

  const roster = profiles.map((p) => `${p.name}: ${p.id}`).join(", ");
  const systemPrompt = `You are a sales pipeline assistant. You are scoped to exactly one lead and can only act through the 4 tools provided — you cannot look up or modify any other lead.

Current lead: name=${lead.name}, email=${lead.email}, company=${lead.company ?? "none"}, status=${lead.status}, assigned_to=${lead.assigned_to ?? "unassigned"}.
Team roster (name: profile id, use the id for assign_lead): ${roster || "none"}.

Call a tool when the user asks you to take an action. Otherwise reply conversationally and briefly.`;

  // Prior turns (capped to the last 10) give the model conversational
  // memory - "no, assign it to the other one" only makes sense with the
  // preceding turn in context. Only role+content is replayed, not raw tool
  // calls: each assistant turn's tool results were already flattened into
  // plain text (see the `reply` built below), which is enough context
  // without re-sending tool-call payloads the model doesn't need to re-see.
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: userMessage },
  ];

  const message = await nvidiaChat(messages, {
    tools: COPILOT_TOOLS as unknown as unknown[],
    maxTokens: 300,
  });

  if (!message.tool_calls || message.tool_calls.length === 0) {
    return { reply: message.content ?? "…", actions: [] };
  }

  const actions: CopilotAction[] = [];
  for (const call of message.tool_calls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      // malformed arguments — treat as empty, handler will reject as needed
    }
    actions.push(await runTool(call.function.name, args, leadId, actorId));
  }

  const reply = actions
    .map((a) => (a.ok ? a.detail : `Couldn't ${a.tool.replace(/_/g, " ")}: ${a.detail}`))
    .join(" ");

  return { reply, actions };
}
