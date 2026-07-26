-- Fix: check_rate_limit only ever pruned rows matching the CURRENT key, so
-- a key that's rarely re-checked (e.g. an IP that submits once and never
-- returns) left its row behind forever. Now prunes ALL globally-stale rows
-- on every call, not just the current key's — bounded, cheap with the
-- index below, and self-maintaining without a cron job.
create index if not exists rate_limit_events_created_idx on rate_limit_events(created_at);

create or replace function check_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare recent_count int;
begin
  delete from rate_limit_events where created_at < now() - (p_window_seconds || ' seconds')::interval;
  select count(*) into recent_count from rate_limit_events where key = p_key;
  if recent_count >= p_max then return false; end if;
  insert into rate_limit_events (key) values (p_key);
  return true;
end; $$;

-- Fix: check_duplicate_lead only matched on exact email. Same person
-- resubmitting under a different email but the same phone number went
-- undetected. Now flags either match — still a cheap, deterministic check,
-- no fuzzy matching (that's a real feature in its own right, not something
-- to bolt on here).
drop function if exists check_duplicate_lead(text, int);

create or replace function check_duplicate_lead(p_email text, p_phone text, p_days int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  return exists (
    select 1 from leads
    where created_at > now() - (p_days || ' days')::interval
      and (email = p_email or (p_phone is not null and p_phone <> '' and phone = p_phone))
  );
end; $$;
grant execute on function check_duplicate_lead(text, text, int) to anon, authenticated;
