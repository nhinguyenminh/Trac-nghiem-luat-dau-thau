-- Run this in Supabase SQL Editor after creating the 4 tables.
-- This script assumes these columns already exist exactly as below.

-- 1) Enable RLS
alter table if exists public.profiles enable row level security;
alter table if exists public.question_progress enable row level security;
alter table if exists public.stats enable row level security;
alter table if exists public.settings enable row level security;

-- 2) Add primary key / unique constraints used by upsert
-- profiles: one row per profile id
alter table if exists public.profiles
  add constraint if not exists profiles_pkey primary key (id);

-- question_progress: one row per question per profile
alter table if exists public.question_progress
  add constraint if not exists question_progress_user_profile_question_key unique (user_id, profile_id, question_id);

-- stats: one row per profile
alter table if exists public.stats
  add constraint if not exists stats_user_profile_key unique (user_id, profile_id);

-- settings: one row per profile
alter table if exists public.settings
  add constraint if not exists settings_user_profile_key unique (user_id, profile_id);

-- 3) Useful indexes
create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_question_progress_user_profile on public.question_progress (user_id, profile_id);
create index if not exists idx_question_progress_last_updated on public.question_progress (last_updated desc);
create index if not exists idx_stats_user_profile on public.stats (user_id, profile_id);
create index if not exists idx_settings_user_profile on public.settings (user_id, profile_id);

-- 4) Optional referential integrity (recommended)
-- If types differ between profile_id and profiles.id, skip these constraints.
alter table if exists public.question_progress
  add constraint if not exists question_progress_profile_fk
  foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table if exists public.stats
  add constraint if not exists stats_profile_fk
  foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table if exists public.settings
  add constraint if not exists settings_profile_fk
  foreign key (profile_id) references public.profiles(id) on delete cascade;

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
  for select using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = user_id);

create policy question_progress_select_own on public.question_progress
  for select using (auth.uid() = user_id);
create policy question_progress_insert_own on public.question_progress
  for insert with check (auth.uid() = user_id);
create policy question_progress_update_own on public.question_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy question_progress_delete_own on public.question_progress
  for delete using (auth.uid() = user_id);

create policy stats_select_own on public.stats
  for select using (auth.uid() = user_id);
create policy stats_insert_own on public.stats
  for insert with check (auth.uid() = user_id);
create policy stats_update_own on public.stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy stats_delete_own on public.stats
  for delete using (auth.uid() = user_id);

create policy settings_select_own on public.settings
  for select using (auth.uid() = user_id);
create policy settings_insert_own on public.settings
  for insert with check (auth.uid() = user_id);
create policy settings_update_own on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy settings_delete_own on public.settings
  for delete using (auth.uid() = user_id);
