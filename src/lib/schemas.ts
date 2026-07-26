import { z } from "zod";

// Shared by the public capture form (client + server action) and the API
// route it posts to — one schema, validated identically on both sides. This
// is what "enforced on both client and server" means in practice: the same
// rules, not a UI hint on one side and a different check on the other.
export const captureLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot: a real browser never fills this in (hidden via CSS, not
  // `type="hidden"`, so a bot's autofill/heuristics are more likely to catch
  // it). Any non-empty value here means it wasn't a human. Deliberately
  // unconstrained (not max(0)) — the route handler is what decides what to
  // do with a non-empty value, and needs it to actually reach that check
  // instead of being rejected here as a 400 (which would leak to a bot that
  // it got caught, defeating the "pretend success" response).
  website: z.string().max(200).optional().or(z.literal("")),
});

export type CaptureLeadInput = z.infer<typeof captureLeadSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
});

export const assignLeadSchema = z.object({
  assigned_to: z.string().uuid().nullable(),
});

export const addNoteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(5000),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
});
