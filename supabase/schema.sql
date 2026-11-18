-- Click Si: database schema for Supabase
-- Run this whole file once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it only creates what is missing and replaces functions and policies.

-- ---------- tables ----------

-- One row per account. Created automatically when someone signs up (see handle_new_user).
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  name        text not null default 'เพื่อน',
  role        text not null default 'user' check (role in ('user','admin')),
  pro         boolean not null default false,
  suspended   boolean not null default false,
  settings    jsonb not null default '{}'::jsonb,   -- payday, theme, card colour, notification settings ...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The bills (with their payment history) and the in-app notifications of each account.
create table if not exists public.user_data (
  user_id     uuid primary key references auth.users on delete cascade,
  items       jsonb not null default '[]'::jsonb,
  inbox       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Settings the admin changes in the back office (prices, menus, categories, banks, reminder texts).
create table if not exists public.app_config (
  id          int primary key default 1 check (id = 1),
  config      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;

-- Announcements the admin sends to every user.
create table if not exists public.broadcasts (
  id          text primary key,
  ts          bigint not null,
  data        jsonb not null,
  created_by  uuid default auth.uid()
);

-- What admins did in the back office.
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users on delete set null,
  email       text,
  text        text not null
);
create index if not exists audit_log_ts on public.audit_log (ts desc);

-- Usage statistics: screens opened and buttons pressed (button function names only, never what was typed).
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users on delete cascade,
  name        text not null,
  props       jsonb not null default '{}'::jsonb
);
create index if not exists events_ts on public.events (ts desc);
create index if not exists events_name on public.events (name, ts desc);

-- ---------- helpers ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and role = 'admin' and not suspended);
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and not suspended);
$$;

-- New sign-up -> profile row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email),
          coalesce(nullif(left(trim(new.raw_user_meta_data->>'name'), 30), ''), 'เพื่อน'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change role, Pro and suspension; nobody changes id or email from the app.
-- (Running SQL in the dashboard has no signed-in user, so the owner can still promote the first admin.)
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    new.role := old.role;
    new.pro := old.pro;
    new.suspended := old.suspended;
  end if;
  new.id := old.id;
  new.email := old.email;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- row level security ----------

alter table public.profiles   enable row level security;
alter table public.user_data  enable row level security;
alter table public.app_config enable row level security;
alter table public.broadcasts enable row level security;
alter table public.audit_log  enable row level security;
alter table public.events     enable row level security;

-- profiles: you see and edit your own; admins see and edit everyone.
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles insert" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'user' and not pro and not suspended);
create policy "profiles update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- user_data: only the owner, and not while suspended.
drop policy if exists "user_data own" on public.user_data;
create policy "user_data own" on public.user_data for all to authenticated
  using (user_id = (select auth.uid()) and public.is_active())
  with check (user_id = (select auth.uid()) and public.is_active());

-- app_config: everyone can read (the sign-up page needs it); admins write.
drop policy if exists "config read"  on public.app_config;
drop policy if exists "config write" on public.app_config;
create policy "config read"  on public.app_config for select to anon, authenticated using (true);
create policy "config write" on public.app_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- broadcasts: signed-in users read; admins write.
drop policy if exists "broadcasts read"  on public.broadcasts;
drop policy if exists "broadcasts write" on public.broadcasts;
create policy "broadcasts read"  on public.broadcasts for select to authenticated using (true);
create policy "broadcasts write" on public.broadcasts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- audit_log: anyone signed in adds their own line; only admins read.
drop policy if exists "audit insert" on public.audit_log;
drop policy if exists "audit read"   on public.audit_log;
create policy "audit insert" on public.audit_log for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "audit read" on public.audit_log for select to authenticated using (public.is_admin());

-- events: anyone signed in adds their own; only admins read.
drop policy if exists "events insert" on public.events;
drop policy if exists "events read"   on public.events;
create policy "events insert" on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "events read" on public.events for select to authenticated using (public.is_admin());

-- ---------- access for the app's key ----------

grant select on public.app_config to anon;
grant select, insert, update                 on public.profiles   to authenticated;
grant select, insert, update, delete         on public.user_data  to authenticated;
grant select, insert, update, delete         on public.app_config to authenticated;
grant select, insert, update, delete         on public.broadcasts to authenticated;
grant select, insert                         on public.audit_log  to authenticated;
grant select, insert                         on public.events     to authenticated;
grant execute on function public.is_admin(), public.is_active() to authenticated;

-- ---------- after your first sign-up ----------
-- Make yourself admin (change the email), then sign out and in again:
--   update public.profiles set role = 'admin', pro = true where email = 'you@email.com';
--
-- Usage statistics, last 7 days:
--   select name, props->>'fn' as button, props->>'view' as screen, count(*)
--   from public.events where ts > now() - interval '7 days'
--   group by 1, 2, 3 order by 4 desc;
