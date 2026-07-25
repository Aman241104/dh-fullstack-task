-- Seeds profiles rows for the two demo accounts created manually in
-- Dashboard -> Authentication -> Users. Looks up auth.users by email so no
-- UUID needs to be copied by hand. Safe to re-run (upserts on id).

insert into profiles (id, role, name)
select id, 'admin', 'Admin'
from auth.users
where email = 'admin1234@gmail.com'
on conflict (id) do update set role = excluded.role, name = excluded.name;

insert into profiles (id, role, name)
select id, 'member', 'Member'
from auth.users
where email = 'user1234@gmail.com'
on conflict (id) do update set role = excluded.role, name = excluded.name;

select id, role, name from profiles;
