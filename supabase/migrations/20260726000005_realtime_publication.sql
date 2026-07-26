-- Enables Realtime delivery for the `leads` table. Without this, the
-- postgres_changes subscription in board-client.tsx silently receives
-- nothing — Supabase only streams changes for tables explicitly added to
-- this publication. Realtime still respects each subscriber's RLS (a
-- member's channel only gets events for rows they could already SELECT),
-- so this doesn't widen access, only turns on delivery.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table leads;
  end if;
end $$;
