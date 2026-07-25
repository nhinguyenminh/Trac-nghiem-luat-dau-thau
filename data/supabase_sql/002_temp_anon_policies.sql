-- TEMP POLICY FOR TESTING WITHOUT SUPABASE AUTH
-- WARNING: This is insecure for public production use.
-- Use only for short-term testing, then migrate to Supabase Auth + auth.uid() policies.

-- profiles
alter table if exists public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

drop policy if exists profiles_select_anon_temp on public.profiles;
drop policy if exists profiles_insert_anon_temp on public.profiles;
drop policy if exists profiles_update_anon_temp on public.profiles;
drop policy if exists profiles_delete_anon_temp on public.profiles;

create policy profiles_select_anon_temp on public.profiles
for select to anon using (true);

create policy profiles_insert_anon_temp on public.profiles
for insert to anon with check (true);

create policy profiles_update_anon_temp on public.profiles
for update to anon using (true) with check (true);

create policy profiles_delete_anon_temp on public.profiles
for delete to anon using (true);

-- question_progress
alter table if exists public.question_progress enable row level security;
drop policy if exists question_progress_select_own on public.question_progress;
drop policy if exists question_progress_insert_own on public.question_progress;
drop policy if exists question_progress_update_own on public.question_progress;
drop policy if exists question_progress_delete_own on public.question_progress;

drop policy if exists question_progress_select_anon_temp on public.question_progress;
drop policy if exists question_progress_insert_anon_temp on public.question_progress;
drop policy if exists question_progress_update_anon_temp on public.question_progress;
drop policy if exists question_progress_delete_anon_temp on public.question_progress;

create policy question_progress_select_anon_temp on public.question_progress
for select to anon using (true);

create policy question_progress_insert_anon_temp on public.question_progress
for insert to anon with check (true);

create policy question_progress_update_anon_temp on public.question_progress
for update to anon using (true) with check (true);

create policy question_progress_delete_anon_temp on public.question_progress
for delete to anon using (true);

-- stats
alter table if exists public.stats enable row level security;
drop policy if exists stats_select_own on public.stats;
drop policy if exists stats_insert_own on public.stats;
drop policy if exists stats_update_own on public.stats;
drop policy if exists stats_delete_own on public.stats;

drop policy if exists stats_select_anon_temp on public.stats;
drop policy if exists stats_insert_anon_temp on public.stats;
drop policy if exists stats_update_anon_temp on public.stats;
drop policy if exists stats_delete_anon_temp on public.stats;

create policy stats_select_anon_temp on public.stats
for select to anon using (true);

create policy stats_insert_anon_temp on public.stats
for insert to anon with check (true);

create policy stats_update_anon_temp on public.stats
for update to anon using (true) with check (true);

create policy stats_delete_anon_temp on public.stats
for delete to anon using (true);

-- settings
alter table if exists public.settings enable row level security;
drop policy if exists settings_select_own on public.settings;
drop policy if exists settings_insert_own on public.settings;
drop policy if exists settings_update_own on public.settings;
drop policy if exists settings_delete_own on public.settings;

drop policy if exists settings_select_anon_temp on public.settings;
drop policy if exists settings_insert_anon_temp on public.settings;
drop policy if exists settings_update_anon_temp on public.settings;
drop policy if exists settings_delete_anon_temp on public.settings;

create policy settings_select_anon_temp on public.settings
for select to anon using (true);

create policy settings_insert_anon_temp on public.settings
for insert to anon with check (true);

create policy settings_update_anon_temp on public.settings
for update to anon using (true) with check (true);

create policy settings_delete_anon_temp on public.settings
for delete to anon using (true);
