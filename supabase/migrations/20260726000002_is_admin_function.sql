-- Wraps the repeated "is this caller an admin" subquery into a reusable
-- security definer function, per Supabase's own RLS performance guidance:
-- nested subqueries inline in every policy are the common perf footgun at
-- scale; a security definer function wrapped in a stable/select is faster
-- and removes the duplication across leads/lead_notes/lead_activity's admin
-- policies. No behavior change — same check, one place instead of four.

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists leads_admin_all on leads;
create policy leads_admin_all on leads for all to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists lead_notes_admin_all on lead_notes;
create policy lead_notes_admin_all on lead_notes for all to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists lead_activity_admin_all on lead_activity;
create policy lead_activity_admin_all on lead_activity for all to authenticated
  using (is_admin())
  with check (is_admin());
