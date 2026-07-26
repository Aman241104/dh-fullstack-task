-- Admin-configurable app settings — currently just the new-lead alert email.
-- Singleton row (id fixed to a known uuid) rather than a key/value table:
-- there's exactly one setting so far, no need for the extra indirection.
create table if not exists app_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  alert_email text,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values ('00000000-0000-0000-0000-000000000001')
  on conflict (id) do nothing;

alter table app_settings enable row level security;
drop policy if exists app_settings_admin_all on app_settings;
create policy app_settings_admin_all on app_settings
  for all using (is_admin()) with check (is_admin());

-- Security definer so the public capture form's anon-role notify path can
-- read just the configured email (not the whole settings row, and nothing
-- else in the table) without needing a SELECT grant on app_settings itself.
create or replace function get_alert_email()
returns text language sql security definer set search_path = public as $$
  select alert_email from app_settings where id = '00000000-0000-0000-0000-000000000001';
$$;
grant execute on function get_alert_email() to anon, authenticated;
