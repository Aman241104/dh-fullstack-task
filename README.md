# Docket — Lead Management

Digital Heroes Full Stack Development role (04/16), Task A: "build a lead platform, not a lead
form." A lead management application a small sales team could actually use — public capture form,
authenticated pipeline board, two roles with real enforced permissions, JSON API, and automated
tests against a live database.

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Row Level Security) + Tailwind + Vitest.

## Stated assumption

The brief is intentionally open on exactly what "member" vs "admin" can do. This build assumes:
**member** can view and manage only leads assigned to them (change status, add notes). **admin**
sees and manages every lead, and is the only role that can assign or reassign a lead to a member.
Lead creation happens through the public capture form (anon) — there's no separate "admin manually
adds a lead" flow in this build, since the brief's primary creation path is the public form.

## Roles / demo credentials

Two accounts exist for review — one per role:

| Role | Email | Password |
|---|---|---|
| admin | `admin1234@gmail.com` | `admin1234` |
| member | `user1234@gmail.com` | `user1234` |

## Architecture

**Data model** (`supabase/migrations/`):
- `profiles` — one row per `auth.users` row, carries the `role` (admin/member).
- `leads` — status pipeline (`new` → `contacted` → `qualified` → `won`/`lost`), `assigned_to`.
- `lead_notes` — timestamped notes per lead.
- `lead_activity` — append-only audit trail, written as a side effect of every mutation (status
  change, assignment, note add) from the API layer (`src/lib/leads.ts`), not a DB trigger — faster
  to implement and test within this build's time budget. A trigger-based version would be more
  robust (can't be bypassed by a future write path that forgets to log), and is the honest
  "if I had more time" answer here, not silently glossed over.

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

## API contract

All routes require an authenticated session except the public capture endpoint.

### `GET /api/leads`
Query params: `page` (default 1), `pageSize` (default 20, max 100), `status`, `assigned_to`,
`search` (matches name/email/company).
Response `200`: `{ data: Lead[], page, pageSize, total }`. `401` if unauthenticated.

### `POST /api/leads`
Public capture form. No auth required. Body: `{ name, email, phone?, company?, message? }`.
`201` on success (or on a caught honeypot — success is faked so a bot doesn't learn it was caught).
`400` on validation failure, `429` if the same IP has submitted more than 5 times in 60 seconds.

### `GET /api/leads/:id`
`200` with the lead, `404` if it doesn't exist *or* the caller's RLS doesn't grant visibility —
deliberately the same response either way, so an unauthorized caller can't distinguish "doesn't
exist" from "exists but isn't yours." `401` if unauthenticated.

### `PATCH /api/leads/:id`
Body: `{ status }`. Admin or the assigned member only (RLS-backed). `200`, `400`, `401`, `404`.

### `PATCH /api/leads/:id/assign`
Body: `{ assigned_to: string | null }`. Admin only — `403` for anyone else, checked explicitly in
the route in addition to RLS. `200`, `400`, `401`, `403`, `404`.

### `GET /api/leads/:id/notes` / `POST /api/leads/:id/notes`
Body (POST): `{ body }`. `200`/`201`, `400`, `401`, `404`.

### `GET /api/leads/:id/activity`
Read-only — there is no write endpoint for this resource at all. Every entry is a side effect of
another mutation. `200`, `401`, `404`.

## Tests

Real integration tests (`tests/`) against the live Supabase project — real sessions signed in with
the two demo accounts above, no mocking. Same pattern used previously on a sibling project after an
RLS gap there went undetected by any test that only checked application code:

```bash
npm run test
```

- `auth-rules.test.ts` — anon can insert but not read; a member can read/update only their own
  assigned lead and cannot reassign it even to themselves; admin can read and act on everything.
- `core-flows.test.ts` — two full lifecycles: (1) a public form submission becomes a real,
  admin-visible `new` lead; (2) assign → status change → note add, with the activity trail showing
  all three in the correct order.

## Known, disclosed limitation

The public form's rate limit is in-memory, keyed by IP, reset per serverless instance/cold start —
a real but partial defense (the honeypot field is the primary one). A production version would use
a shared store (Upstash Redis) or a DB-backed counter; out of scope for this build's time budget.

## Local development

```bash
npm install
npm run dev
npm run test
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and the
`TEST_*` credential vars above, for the test suite).
