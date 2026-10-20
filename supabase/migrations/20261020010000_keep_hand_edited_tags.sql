-- Run once in Supabase -> SQL Editor, after 20261020000000_admin_roles_and_tags.sql.
-- Keeps tags an admin edited by hand. The meme board's Gemini tagger saves
-- tags with the service-role key (and re-tags a crack whenever its owner
-- edits it); admins save with their own login. When the service role
-- tries to change a row an admin edited, the change is quietly dropped.
-- Clearing the tags (deleting the row) lets Gemini tag the crack again.

create or replace function public.keep_hand_edited_tags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.edited_by is not null
     and coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_hand_edited_tags on public.crack_traits;
create trigger keep_hand_edited_tags
  before update on public.crack_traits
  for each row execute function public.keep_hand_edited_tags();
