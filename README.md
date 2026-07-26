# Docket — Lead Management

Digital Heroes Full Stack Development role (04/16), Task A: "build a lead platform, not a lead
form." A lead management application a small sales team could actually use — public capture form,
authenticated pipeline board (grid and Kanban), two roles with real enforced permissions, an AI
lead-scoring and Copilot layer, live Realtime updates, a JSON API, and automated tests against a
live database.

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Row Level Security, Realtime) + Tailwind + Vitest
+ NVIDIA NIM (AI scoring/Copilot) + Resend (email) + Sentry (error tracking).

## Stated assumption

The brief is intentionally open on exactly what "member" vs "admin" can do. This build assumes:
**member** can view and manage only leads assigned to them (change status, add notes). **admin**
sees and manages every lead, and is the only role that can assign or reassign a lead to a member,
manage the IP allowlist, and set the notification alert email. Lead creation happens through the
public capture form (anon) — there's no separate "admin manually adds a lead" flow in this build,
since the brief's primary creation path is the public form.

## Roles / demo credentials

Two accounts exist for review — one per role:

| Role | Email | Password |
|---|---|---|
| admin | `admin1234@gmail.com` | `admin1234` |
| member | `user1234@gmail.com` | `user1234` |

## Feature list

- **Pipeline board** — grid view and a drag-and-drop Kanban view (`@dnd-kit`), filterable by
  status/assignee/search, CSV export.
- **AI lead scoring** — hybrid deterministic + AI: a cheap rule-based score first, an NVIDIA NIM
  call (`meta/llama-3.1-8b-instruct`) only for the ambiguous middle band (35-65), so obvious cases
  never pay for a model call. Falls back to the deterministic score if the API isn't configured or
  the call fails.
- **AI Copilot** — scoped to exactly 4 tools (`add_note`, `update_status`, `assign_lead`,
  `summarize_lead`) inside a single lead's detail drawer, with conversation memory across turns.
  Every tool executes through the same RLS-scoped functions the rest of the app uses — there's no
  service-role shortcut for the AI layer, so a member's Copilot session is bound by the same
  permissions a manual API call would be.
- **Realtime** — the board subscribes to Postgres changes on `leads` and refreshes live when
  another session mutates a row, scoped by the same RLS a manual query would respect.
- **Duplicate detection** — flags a new submission as a possible duplicate if it matches an
  existing lead's email *or* phone number within 7 days; admins/members can dismiss a false
  positive from the lead drawer.
- **Email notifications** — Resend, throttled to one email per 30s per recipient so a burst of
  leads can't spam the inbox one email per lead. Recipient is admin-configurable in Settings, with
  an env-var fallback.
- **Two-factor auth** — native Supabase Auth TOTP, enrolled and managed from Settings.
- **IP allowlist** — admin-configurable, default empty (unrestricted); enforced in middleware for
  the pipeline routes, never for `/login` or `/settings` (so a bad entry can't lock an admin out of
  fixing it).
- **Sentry** — client, server, and edge error tracking.
- **Team activity feed** — a read-only, RLS-scoped feed of every mutation across the pipeline.

## Architecture

**Data model** (`supabase/migrations/`):
- `profiles` — one row per `auth.users` row, carries the `role` (admin/member).
- `leads` — status pipeline (`new` → `contacted` → `qualified` → `won`/`lost`), `assigned_to`,
  `score`/`score_reason`, `possible_duplicate`.
- `lead_notes` — timestamped notes per lead.
- `lead_activity` — append-only audit trail, written as a side effect of every mutation (status
  change, assignment, note add, duplicate-flag dismissal) from the API layer (`src/lib/leads.ts`),
  not a DB trigger — faster to implement and test within this build's time budget. A trigger-based
  version would be more robust (can't be bypassed by a future write path that forgets to log), and
  is the honest "if I had more time" answer here, not silently glossed over.
- `rate_limit_events` — backs the DB-level rate limiter (see below).
- `ip_allowlist`, `app_settings` — admin-managed configuration, RLS-gated to admin only.

**Permissions are enforced twice, deliberately:**
1. Row Level Security policies on every table — the real, unbypassable boundary. Public form
   inserts as `anon`, which has an INSERT-only grant (no select/update/delete exists for `anon` at
   all). Admin has full access via a `for all to authenticated using (is_admin())` policy backed by
   a `security definer` function. A member's policies only match rows where `assigned_to =
   auth.uid()`.
2. An explicit check in each API route handler (`src/app/api/leads/**/route.ts`) — e.g. the assign
   endpoint checks `profile.role === "admin"` and returns a clean `403` before ever touching the
   database. This exists so a raw Postgres RLS violation doesn't leak to the client as an
   undifferentiated `500` — the RLS policy is still the real backstop if this check were somehow
   skipped.

Verified directly, not just asserted: a member's session hitting `PATCH /api/leads/:id/assign`
returns `403 {"error":"Forbidden — admin only"}` even when called straight against the API,
bypassing the UI entirely (the UI also hides the control, but that's not what's actually stopping
it).

**No service-role client exists anywhere in the app runtime** — including the AI Copilot's tool
execution layer. "Admin" is enforced purely as a `profiles.role` value checked inside RLS policies
and application-level checks, never a Postgres-level bypass.

**Rate limiting and duplicate/allowlist checks run through `security definer` Postgres functions**
(`check_rate_limit`, `check_duplicate_lead`, `is_ip_allowed`, `get_alert_email`) — this lets the
`anon` role perform narrow, safe operations without ever granting `anon` direct table access to
`rate_limit_events`, `ip_allowlist`, or `app_settings`.

**IP allowlist trust boundary:** the allowlist gate (`middleware.ts`) trusts the first hop of
`x-forwarded-for`, which is only safe because Vercel's edge network sets that header itself and a
client can't inject an earlier hop in front of it. This is **not** safe to deploy behind an
arbitrary reverse proxy that forwards a client-controlled header unmodified.

**A note on `middleware.ts` vs `proxy.ts`:** Next.js 16 deprecated `middleware.ts` in favor of
`proxy.ts`/`export function proxy()`. This project's installed Next.js version (16.2.11) validates
a `proxy.ts` file's export shape at compile time but never actually registers it in the middleware
manifest — confirmed empty in both dev and `next build`, in both Turbopack and webpack, even for a
zero-dependency file. `middleware.ts` is kept deliberately (with its deprecation warning) because
it's the one that actually runs. Revisit on a future Next.js upgrade.

## API contract

All routes require an authenticated session except the public capture endpoint.

### `GET /api/leads`
Query params: `page` (default 1), `pageSize` (default 20, max 100), `status`, `assigned_to`,
`search` (matches name/email/company).
Response `200`: `{ data: Lead[], page, pageSize, total }`. `401` if unauthenticated.

### `POST /api/leads`
Public capture form. No auth required. Body: `{ name, email, phone?, company?, message? }`.
`201` on success (or on a caught honeypot — success is faked so a bot doesn't learn it was caught).
`400` on validation failure, `429` if the same IP has submitted more than 5 times in 60 seconds
(DB-backed via `check_rate_limit`, shared across serverless instances — see Tests for a caveat).

### `GET /api/leads/:id`
`200` with the lead, `404` if it doesn't exist *or* the caller's RLS doesn't grant visibility —
deliberately the same response either way. `401` if unauthenticated.

### `PATCH /api/leads/:id`
Body: `{ status }`. Admin or the assigned member only (RLS-backed). `200`, `400`, `401`, `404`.

### `PATCH /api/leads/:id/assign`
Body: `{ assigned_to: string | null }`. Admin only — `403` for anyone else, checked explicitly in
the route in addition to RLS. `200`, `400`, `401`, `403`, `404`.

### `POST /api/leads/:id/dismiss-duplicate`
Clears `possible_duplicate` on a lead. Admin or the assigned member. `200`, `401`, `404`.

### `GET /api/leads/:id/notes` / `POST /api/leads/:id/notes`
Body (POST): `{ body }`. `200`/`201`, `400`, `401`, `404`.

### `GET /api/leads/:id/activity` / `GET /api/activity`
Read-only — there is no write endpoint for either; every entry is a side effect of another
mutation. The per-lead endpoint is scoped to one lead; `/api/activity` is the team-wide feed,
RLS-scoped the same way (admin sees everything, a member sees only events on leads assigned to
them). `200`, `401`, `404` (per-lead only).

### `POST /api/leads/:id/copilot`
Body: `{ message: string, history?: {role, content}[] }`. Runs one AI Copilot turn scoped to that
lead. `200: { reply, actions }`, `400`, `401`.

### `GET /api/leads/export`
Same query params as `GET /api/leads`. Streams a CSV of the currently-filtered leads (capped at
1000 rows), scoped by the same RLS as the board itself. `200` with `Content-Type: text/csv`.

### `GET /api/ip-allowlist` / `POST /api/ip-allowlist` / `DELETE /api/ip-allowlist/:id`
Admin only. `200`/`201`, `401`, `403`.

### `GET /api/settings` / `PUT /api/settings`
Admin only — currently just `{ alert_email }`. `200`, `401`, `403`.

## Tests

Real integration tests (`tests/`) against the live Supabase project — real sessions signed in with
the two demo accounts above, no mocking, plus a handful of pure unit tests for logic that doesn't
need a DB (scoring, schema validation):

```bash
npm run test
```

- `auth-rules.test.ts` — anon can insert but not read; a member can read/update only their own
  assigned lead and cannot reassign it even to themselves; admin can read and act on everything.
- `core-flows.test.ts` — two full lifecycles: (1) a public form submission becomes a real,
  admin-visible `new` lead; (2) assign → status change → note add, with the activity trail showing
  all three in the correct order.
- `new-features.test.ts` — deterministic scoring bounds, the honeypot schema's actual behavior
  (accepts a non-empty `website` at the schema level on purpose — see the inline comment for why),
  and the DB-backed security-definer functions: rate limiting, email/phone duplicate detection, IP
  allowlist, and the alert-email setting.

CI (`.github/workflows/ci.yml`) runs `vitest run` and `next build` on every push/PR to `main`. The
DB-backed tests skip themselves automatically (`describe.skipIf(!hasCreds)`) when `TEST_*` secrets
aren't configured in the repo, so CI passes cleanly without any secrets set up — add them under
Settings → Secrets to also exercise the live-DB suite in CI.

Task B (`task-b/`) has its own, independently installable and typecheckable refactor sample —
see `task-b/README.md`.

## Known, disclosed limitations

- The activity trail is written from the API layer, not a DB trigger — see the data model note
  above.
- The email notification throttle (one per 30s per recipient) drops the notification for leads
  that land inside an already-throttled window rather than batching their content into a digest —
  a real digest needs a queue (cron + outbox table), out of scope for this build's time budget.
- Duplicate detection is exact-match on email/phone, not fuzzy — it won't catch the same person
  under a different email *and* a different phone number.
- The AI Copilot's conversation memory is capped at the last 10 turns per session state (not
  persisted server-side) — refreshing the page starts a fresh conversation.

## Local development

```bash
npm install
npm run dev
npm run test
```

Copy `.env.example` to `.env.local` and fill in at minimum `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (and the `TEST_*` credential vars, for the test suite). See
`.env.example` for the full list, including which vars are optional and what degrades gracefully
without them.

Run every file in `supabase/migrations/` against your Supabase project's SQL Editor, in filename
order, before starting the app — several features (rate limiting, duplicate detection, the IP
allowlist, Realtime, the alert-email setting) depend on functions/tables those migrations create.
