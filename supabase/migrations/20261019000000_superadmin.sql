-- Run once in Supabase -> SQL Editor (the same project as the main app).
-- Sets up the admin area:
-- 1. profiles.is_superadmin, which only the database owner can set.
--    Users could previously update every column of their own profile,
--    which would have let anyone make themselves an admin through the
--    API, so profile updates are now limited to the columns the main app
--    edits.
-- 2. is_superadmin(), used by the policies below.
-- 3. Admin policies: read every profile and caption request, and edit or
--    delete any crack and its image. Everything else admins do (creating
--    their own cracks, reading likes) already works for any user.
--
-- After running this, make yourself an admin (this is the only way in;
-- the apps can't set the flag):
--   update public.profiles set is_superadmin = true
--   where id = (select id from auth.users where email = 'you@columbia.edu');

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

revoke insert, update on public.profiles from authenticated, anon;
grant update (first_name, last_name, screen_name, profpic, notifications_seen_at)
  on public.profiles to authenticated;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_superadmin from profiles where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.is_superadmin());

drop policy if exists "Admins can update any crack" on public.cracks;
create policy "Admins can update any crack"
on public.cracks for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Admins can delete any crack" on public.cracks;
create policy "Admins can delete any crack"
on public.cracks for delete
to authenticated
using (public.is_superadmin());

drop policy if exists "Admins can view all caption requests" on public.caption_requests;
create policy "Admins can view all caption requests"
on public.caption_requests for select
to authenticated
using (public.is_superadmin());

drop policy if exists "Admins can delete any crack image" on storage.objects;
create policy "Admins can delete any crack image"
on storage.objects for delete
to authenticated
using (bucket_id = 'cracks' and public.is_superadmin());

notify pgrst, 'reload schema';
