-- DB-backed rate limiter, replacing the in-memory one in app/api/leads/route.ts.
-- The in-memory version was an honestly-disclosed limitation (resets per
-- serverless instance/cold start) — this closes it using a security definer
-- function so anon never needs direct table grants on rate_limit_events at
-- all, just EXECUTE on the function.

create table if not exists rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_key_created_idx on rate_limit_events(key, created_at);

alter table rate_limit_events enable row level security;
-- No policies granted to anon or authenticated at all — the only way to
-- touch this table is through check_rate_limit() below, which runs as its
-- definer (the table owner), bypassing RLS entirely for its own queries.
-- Direct table access stays fully closed off from every client role.

create or replace function check_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  delete from rate_limit_events
    where key = p_key and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into recent_count from rate_limit_events where key = p_key;

  if recent_count >= p_max then
    return false;
  end if;

  insert into rate_limit_events (key) values (p_key);
  return true;
end;
$$;

grant execute on function check_rate_limit(text, int, int) to anon, authenticated;

-- Duplicate-lead detection for the public capture form. Same reasoning as
-- check_rate_limit above: anon has no SELECT grant on `leads` at all (see
-- the original RLS migration), so checking "does this email already exist"
-- needs a security definer function rather than a direct query anon could
-- never run in the first place.

create or replace function check_duplicate_lead(p_email text, p_days int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from leads
    where email = p_email
      and created_at > now() - (p_days || ' days')::interval
  );
end;
$$;

grant execute on function check_duplicate_lead(text, int) to anon, authenticated;

-- Flag on leads for the duplicate-detection result — a duplicate isn't
-- rejected outright (a real second inquiry from the same person within a
-- few days is plausible, e.g. a follow-up question), just flagged so the
-- team can see and decide, matching the "flag or merge" language in the
-- brief rather than "silently block."
alter table leads add column if not exists possible_duplicate boolean not null default false;
