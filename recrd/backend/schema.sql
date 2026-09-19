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
