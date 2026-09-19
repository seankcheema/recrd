-- recrd — migration 001: usernames
--
-- Splits the single `name` column into two: `name` stays the display name and
-- repeats freely, `username` becomes the unique handle people are found and
-- @-mentioned by.
--
-- Existing rows are backfilled from the local part of their email before the
-- column is made required, so this is safe to run against a live database.
-- Safe to re-run: every statement is idempotent and the backfill only touches
-- rows that have no handle yet.
--
-- Apply in the Supabase dashboard (SQL Editor), or:
--   psql "<your supabase connection string>" -f backend/migrations/001_usernames.sql

begin;

create extension if not exists "citext";

alter table profiles add column if not exists username citext;

-- Backfill: "sean.cheema@gmail.com" -> "sean.cheema", with a counter appended
-- when two people would otherwise land on the same handle.
with candidates as (
  select
    id,
    nullif(
      left(regexp_replace(lower(split_part(email::text, '@', 1)), '[^a-z0-9_.]', '', 'g'), 18),
      ''
    ) as base
  from profiles
  where username is null
),
numbered as (
  select
    id,
    coalesce(base, 'listener') as base,
    row_number() over (partition by coalesce(base, 'listener') order by id) as n
  from candidates
)
update profiles p
set username = case when numbered.n = 1 then numbered.base
                    else numbered.base || numbered.n::text end
from numbered
where p.id = numbered.id;

alter table profiles alter column username set not null;

create unique index if not exists profiles_username_key on profiles (username);

commit;
