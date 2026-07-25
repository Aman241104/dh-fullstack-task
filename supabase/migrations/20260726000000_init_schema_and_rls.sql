-- Docket — lead management schema + RLS policies.
--
-- Assumption stated per the kit's own rule ("assumptions are part of the test"):
-- "member" role can view/manage only leads assigned to them (read/update status,
-- add notes). "admin" sees and manages everything, and is the only role that can
-- assign/reassign a lead to a member. The public capture form writes as `anon`
-- and can only INSERT — no SELECT/UPDATE/DELETE — that's the entire security
-- boundary the public form sits behind.
--
-- Pattern follows whatsapp-agents' RLS migration (supabase/migrations/
-- 20260702000000_enable_rls_tenant_isolation.sql): idempotent (drop policy if
-- exists before every create), every policy sets both `using` and `with check`,
-- comments explain why. That project shipped with RLS never enabled on any
-- table and a real cross-tenant leak as a result — this one enables RLS from
-- the first migration, before any app code touches these tables.

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth.users row. role drives every permission check below.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Any authenticated user can see the id/name/role of every other user — needed
-- so the UI can render "assigned to <name>" and populate the assign-to dropdown.
-- Nothing sensitive lives on this table, so a broad SELECT is fine.
drop policy if exists profiles_authenticated_read on profiles;
create policy profiles_authenticated_read on profiles for select to authenticated
  using (true);

-- Users can update their own name, but NOT their own role — role changes only
-- happen via the service_role client (an explicit admin action), never through
-- a policy a user's own session could exploit to self-promote to admin.
drop policy if exists profiles_update_own_name on profiles;
create policy profiles_update_own_name on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- ── leads ────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  source text not null default 'public_form',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  assigned_to uuid references profiles(id),
  score int,
  score_reason text,
  created_at timestamptz not null default now()
);

alter table leads enable row level security;

-- Public capture form: anon can INSERT only. No select/update/delete grant
-- exists for anon at all — an unauthenticated caller with just the anon key
-- cannot read a single lead back, cannot see who submitted what.
drop policy if exists leads_public_insert on leads;
create policy leads_public_insert on leads for insert to anon
  with check (status = 'new' and assigned_to is null);

-- Admins: full access to every lead.
drop policy if exists leads_admin_all on leads;
create policy leads_admin_all on leads for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Members: select/update only on leads assigned to them. No insert/delete —
-- per the stated assumption, only admins add leads manually in the
-- authenticated app (the public form is the other entry point, and that's
-- anon, not member).
drop policy if exists leads_member_select_own on leads;
create policy leads_member_select_own on leads for select to authenticated
  using (assigned_to = auth.uid());

drop policy if exists leads_member_update_own on leads;
create policy leads_member_update_own on leads for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- ── lead_notes ───────────────────────────────────────────────────────────────
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table lead_notes enable row level security;

-- Access to a lead's notes mirrors access to the lead itself: admin sees/adds
-- notes on anything, a member only on leads assigned to them.
drop policy if exists lead_notes_admin_all on lead_notes;
create policy lead_notes_admin_all on lead_notes for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists lead_notes_member_own_lead on lead_notes;
create policy lead_notes_member_own_lead on lead_notes for all to authenticated
  using (exists (select 1 from leads where id = lead_id and assigned_to = auth.uid()))
  with check (
    author_id = auth.uid()
    and exists (select 1 from leads where id = lead_id and assigned_to = auth.uid())
  );

-- ── lead_activity ────────────────────────────────────────────────────────────
-- Append-only audit trail. Written by the API layer (not a DB trigger, for
-- speed of implementation) on every status change, assignment, and note add —
-- see lib/leads.ts. Read-only from the client's perspective: no update/delete
-- policy exists for any role, matching its purpose as an audit trail.
create table if not exists lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  actor_id uuid not null references profiles(id),
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table lead_activity enable row level security;

drop policy if exists lead_activity_admin_all on lead_activity;
create policy lead_activity_admin_all on lead_activity for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists lead_activity_member_own_lead on lead_activity;
create policy lead_activity_member_own_lead on lead_activity for all to authenticated
  using (exists (select 1 from leads where id = lead_id and assigned_to = auth.uid()))
  with check (
    actor_id = auth.uid()
    and exists (select 1 from leads where id = lead_id and assigned_to = auth.uid())
  );

-- ── indexes ──────────────────────────────────────────────────────────────────
-- Every column referenced inside an RLS policy's using/with check needs an
-- index — an unindexed RLS filter is the most common Supabase performance
-- footgun (each row check does a real lookup on every query).
create index if not exists leads_assigned_to_idx on leads(assigned_to);
create index if not exists lead_notes_lead_id_idx on lead_notes(lead_id);
create index if not exists lead_activity_lead_id_idx on lead_activity(lead_id);
