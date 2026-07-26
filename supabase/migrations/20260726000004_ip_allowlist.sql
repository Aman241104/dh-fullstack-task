-- Admin-configurable IP allowlist. Default empty = disabled: an empty table
-- means every IP is allowed, so adding this feature can never lock anyone
-- out by default — it only starts restricting once an admin adds at least
-- one entry.
create table if not exists ip_allowlist (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table ip_allowlist enable row level security;

drop policy if exists ip_allowlist_admin_all on ip_allowlist;
create policy ip_allowlist_admin_all on ip_allowlist
  for all using (is_admin()) with check (is_admin());

-- Security definer so middleware can check this on every request regardless
-- of who's asking, without granting anon/authenticated direct table access
-- (same pattern as check_rate_limit/check_duplicate_lead/is_admin).
create or replace function is_ip_allowed(p_ip text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  total int;
begin
  select count(*) into total from ip_allowlist;
  if total = 0 then
    return true;
  end if;
  return exists (select 1 from ip_allowlist where ip = p_ip);
end;
$$;
grant execute on function is_ip_allowed(text) to anon, authenticated;
