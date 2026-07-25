-- Run this in Supabase SQL Editor after creating the 4 tables.
-- This script assumes these columns already exist exactly as below.

-- 1) Enable RLS
alter table if exists public.profiles enable row level security;
alter table if exists public.question_progress enable row level security;
alter table if exists public.stats enable row level security;
alter table if exists public.settings enable row level security;

-- 2) Add primary key / unique constraints used by upsert
-- profiles: one row per profile id
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_pkey'
  ) then
    alter table public.profiles
      add constraint profiles_pkey primary key (id);
  end if;
end
$$;

-- question_progress: one row per question per profile
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'question_progress_user_profile_question_key'
  ) then
    alter table public.question_progress
      add constraint question_progress_user_profile_question_key unique (user_id, profile_id, question_id);
  end if;
end
$$;

-- stats: one row per profile
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stats_user_profile_key'
  ) then
    alter table public.stats
      add constraint stats_user_profile_key unique (user_id, profile_id);
  end if;
end
$$;

-- settings: one row per profile
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settings_user_profile_key'
  ) then
    alter table public.settings
      add constraint settings_user_profile_key unique (user_id, profile_id);
  end if;
end
$$;

-- 3) Useful indexes
create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_question_progress_user_profile on public.question_progress (user_id, profile_id);
create index if not exists idx_question_progress_last_updated on public.question_progress (last_updated desc);
create index if not exists idx_stats_user_profile on public.stats (user_id, profile_id);
create index if not exists idx_settings_user_profile on public.settings (user_id, profile_id);

-- 4) Optional referential integrity (recommended)
-- If types differ between profile_id and profiles.id, skip these constraints.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'question_progress_profile_fk'
  ) then
    alter table public.question_progress
      add constraint question_progress_profile_fk
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stats_profile_fk'
  ) then
    alter table public.stats
      add constraint stats_profile_fk
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settings_profile_fk'
  ) then
    alter table public.settings
      add constraint settings_profile_fk
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

-- 5) RLS policies (Auth user owns rows by user_id)
-- Remove old policies first if needed.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

drop policy if exists question_progress_select_own on public.question_progress;
drop policy if exists question_progress_insert_own on public.question_progress;
drop policy if exists question_progress_update_own on public.question_progress;
drop policy if exists question_progress_delete_own on public.question_progress;

drop policy if exists stats_select_own on public.stats;
drop policy if exists stats_insert_own on public.stats;
drop policy if exists stats_update_own on public.stats;
drop policy if exists stats_delete_own on public.stats;

drop policy if exists settings_select_own on public.settings;
drop policy if exists settings_insert_own on public.settings;
drop policy if exists settings_update_own on public.settings;
drop policy if exists settings_delete_own on public.settings;

create policy profiles_select_own on public.profiles
  for select using (auth.uid()::text = user_id::text);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid()::text = user_id::text);
create policy profiles_update_own on public.profiles
  for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid()::text = user_id::text);

create policy question_progress_select_own on public.question_progress
  for select using (auth.uid()::text = user_id::text);
create policy question_progress_insert_own on public.question_progress
  for insert with check (auth.uid()::text = user_id::text);
create policy question_progress_update_own on public.question_progress
  for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy question_progress_delete_own on public.question_progress
  for delete using (auth.uid()::text = user_id::text);

create policy stats_select_own on public.stats
  for select using (auth.uid()::text = user_id::text);
create policy stats_insert_own on public.stats
  for insert with check (auth.uid()::text = user_id::text);
create policy stats_update_own on public.stats
  for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy stats_delete_own on public.stats
  for delete using (auth.uid()::text = user_id::text);

create policy settings_select_own on public.settings
  for select using (auth.uid()::text = user_id::text);
create policy settings_insert_own on public.settings
  for insert with check (auth.uid()::text = user_id::text);
create policy settings_update_own on public.settings
  for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy settings_delete_own on public.settings
  for delete using (auth.uid()::text = user_id::text);
