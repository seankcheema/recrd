-- recrd — migration 002: generate a username when one is not supplied
--
-- Fixes "Database error saving a new user" on sign up.
--
-- Supabase projects usually carry a trigger on auth.users that inserts the
-- matching public.profiles row, and it only knows about (id, email, name).
-- Once migration 001 made `username` NOT NULL that insert started failing,
-- which rolls back GoTrue's own insert into auth.users — so sign up dies
-- before the API ever gets to write the handle the person chose.
--
-- Rather than hunt down every insert path, the column now fills itself in:
-- any row that arrives without a username gets one derived from its email.
-- recrd's own sign up still passes the chosen handle, and an explicit value
-- always wins over the generated one.
--
-- Safe to re-run.
--
-- Apply in the Supabase dashboard (SQL Editor), or:
--   psql "<your supabase connection string>" -f backend/migrations/002_username_default.sql

begin;

create or replace function public.profiles_fill_username()
returns trigger
language plpgsql
-- security definer so the uniqueness probe below can read profiles even
-- though RLS is on and the caller may be the auth admin role.
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         int := 1;
begin
  if new.username is not null then
    return new;
  end if;

  -- "sean.cheema@gmail.com" -> "sean.cheema"
  base := nullif(
    left(regexp_replace(lower(split_part(coalesce(new.email::text, ''), '@', 1)),
                        '[^a-z0-9_.]', '', 'g'), 18),
    ''
  );
  base := coalesce(base, 'listener');
  if length(base) < 3 then
    base := left(base || 'user', 20);
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := left(base, 20 - length(n::text)) || n::text;
  end loop;

  new.username := candidate;
  return new;
end;
$$;

drop trigger if exists profiles_fill_username_trg on public.profiles;
create trigger profiles_fill_username_trg
  before insert on public.profiles
  for each row execute function public.profiles_fill_username();

commit;
