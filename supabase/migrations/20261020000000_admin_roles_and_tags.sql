-- Run once in Supabase -> SQL Editor, after 20261019000000_superadmin.sql.
-- 1. set_superadmin(): lets an admin make another user an admin or take it
--    away. Users still can't touch is_superadmin directly, and an admin
--    can't remove their own status, so there's always at least one admin.
-- 2. Admins can add, change and clear a crack's humor tags. Hand-edited
--    tags record who edited them (edited_by), and the meme board's Gemini
--    tagger leaves those rows alone.

create or replace function public.set_superadmin(target uuid, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Only admins can change admin status.' using errcode = '42501';
  end if;
  if target = auth.uid() and not make_admin then
    raise exception 'You can''t remove your own admin status.' using errcode = '42501';
  end if;

  update profiles set is_superadmin = make_admin where id = target;
  if not found then
    raise exception 'No such user.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_superadmin(uuid, boolean) from public, anon;
grant execute on function public.set_superadmin(uuid, boolean) to authenticated;

alter table public.crack_traits
  add column if not exists edited_by uuid references auth.users (id) on delete set null;

drop policy if exists "Admins can add crack traits" on public.crack_traits;
create policy "Admins can add crack traits"
on public.crack_traits for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "Admins can edit crack traits" on public.crack_traits;
create policy "Admins can edit crack traits"
on public.crack_traits for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Admins can clear crack traits" on public.crack_traits;
create policy "Admins can clear crack traits"
on public.crack_traits for delete
to authenticated
using (public.is_superadmin());

notify pgrst, 'reload schema';
