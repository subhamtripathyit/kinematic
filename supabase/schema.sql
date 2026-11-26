-- Kinematic database schema (Supabase / PostgreSQL)
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
-- Safe to re-run: it only creates things that don't exist yet.

-- 1. PROFILES: one row per user (created automatically when a user is added)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. WORKOUTS: one row per finished session (reps, form score, sets... kept as JSON)
create table if not exists public.workouts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,                 -- the session id the app already creates
  exercise_id text not null,
  started_at timestamptz not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists workouts_user_started on public.workouts (user_id, started_at desc);

-- 3. USER_DATA: settings, custom routines and body/weight data (one JSON row per kind)
create table if not exists public.user_data (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key in ('settings', 'routines', 'body')),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- New user in Auth -> matching profile row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Is the logged-in user an admin? (used by the rules below)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- User changed their temporary password -> clear the flag (users can't touch their own role)
create or replace function public.mark_password_changed()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

-- ROW LEVEL SECURITY: every user sees only their own rows
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "own profile, or admin sees all" on public.profiles;
create policy "own profile, or admin sees all" on public.profiles
  for select using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "own workouts" on public.workouts;
create policy "own workouts" on public.workouts
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own data" on public.user_data;
create policy "own data" on public.user_data
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- AFTER you create your own user (Authentication -> Users -> Add user), make yourself admin:
-- update public.profiles set role = 'admin', must_change_password = false where email = 'YOUR-EMAIL';
