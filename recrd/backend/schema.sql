-- recrd/backend/schema.sql
-- Full database schema for recrd. Safe to re-run: every statement is idempotent.
-- Apply with: psql "<your supabase connection string>" -f schema.sql
-- or paste into the Supabase dashboard SQL editor.

create extension if not exists "citext";

-- ── enums ────────────────────────────────────────────────────────────────
do $$ begin
  create type entry_visibility as enum ('public', 'private');
exception when duplicate_object then null; end $$;

-- ── profiles ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       citext      not null unique,
  name        text        not null,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_name_idx on profiles (lower(name));

-- ── usernames ────────────────────────────────────────────────────────────
-- `name` is the display name and repeats freely; `username` is the unique
-- handle people are found by. Added after the fact, so existing rows are
-- backfilled from their email before the column is made required.
-- Also available on its own as migrations/001_usernames.sql.
alter table profiles add column if not exists username citext;

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

-- Any insert that arrives without a handle gets one derived from its email.
-- Supabase's own auth.users trigger only knows about (id, email, name), so
-- without this a NOT NULL username breaks sign up. See
-- migrations/002_username_default.sql.
create or replace function public.profiles_fill_username()
returns trigger
language plpgsql
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

drop trigger if exists profiles_fill_username_trg on profiles;
create trigger profiles_fill_username_trg
  before insert on profiles
  for each row execute function public.profiles_fill_username();

-- ── album_entries: one ranking per user per album ────────────────────────
create table if not exists album_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid        not null references profiles (id) on delete cascade,
  spotify_album_id text        not null,
  album_name       text        not null,
  artist_name      text        not null,
  cover_url        text,
  rank             smallint    not null check (rank between 1 and 10),
  review           text,
  visibility       entry_visibility not null default 'public',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, spotify_album_id)
);

create index if not exists album_entries_user_idx  on album_entries (user_id, created_at desc);
create index if not exists album_entries_album_idx on album_entries (spotify_album_id);

-- ── entry_likes ──────────────────────────────────────────────────────────
create table if not exists entry_likes (
  user_id    uuid        not null references profiles (id) on delete cascade,
  entry_id   uuid        not null references album_entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create index if not exists entry_likes_entry_idx on entry_likes (entry_id);

-- ── entry_comments ───────────────────────────────────────────────────────
create table if not exists entry_comments (
  id         uuid        primary key default gen_random_uuid(),
  entry_id   uuid        not null references album_entries (id) on delete cascade,
  user_id    uuid        not null references profiles (id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists entry_comments_entry_idx on entry_comments (entry_id, created_at);

-- ── user_follows ─────────────────────────────────────────────────────────
create table if not exists user_follows (
  follower_id  uuid        not null references profiles (id) on delete cascade,
  following_id uuid        not null references profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx on user_follows (following_id);

-- ── saved_albums: the "to be listened" list behind the bookmark button ───
create table if not exists saved_albums (
  user_id          uuid        not null references profiles (id) on delete cascade,
  spotify_album_id text        not null,
  album_name       text        not null,
  artist_name      text        not null,
  cover_url        text,
  created_at       timestamptz not null default now(),
  primary key (user_id, spotify_album_id)
);

create index if not exists saved_albums_user_idx on saved_albums (user_id, created_at desc);

-- ── row level security ───────────────────────────────────────────────────
-- The API talks to Postgres with the service key and does its own
-- authorization, so RLS stays on with no permissive policies: anon and
-- authenticated clients get nothing directly.
alter table profiles       enable row level security;
alter table album_entries  enable row level security;
alter table entry_likes    enable row level security;
alter table entry_comments enable row level security;
alter table user_follows   enable row level security;
alter table saved_albums   enable row level security;
