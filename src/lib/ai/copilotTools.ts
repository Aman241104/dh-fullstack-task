// Tool schemas exposed to the model — OpenAI-style function-calling format,
// which is what NVIDIA's tool-calling-capable NIM models expect. Scoped to
// exactly 4 tools by design: the Copilot can act on a lead, not on the
// system at large (no "list all leads", no "delete", no raw SQL).
export const COPILOT_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Add a note to this lead's record.",
      parameters: {
        type: "object",
        properties: {
          body: { type: "string", description: "The note text." },
        },
        required: ["body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_status",
      description: "Change this lead's pipeline status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "won", "lost"],
          },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_lead",
      description: "Assign this lead to a team member, or unassign it.",
      parameters: {
        type: "object",
        properties: {
          assigned_to: {
            type: ["string", "null"],
            description: "The profile id (uuid) of the team member from the roster given in context, or null to unassign.",
          },
        },
        required: ["assigned_to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_lead",
      description: "Summarize this lead's history: notes, status changes, and assignment.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;
