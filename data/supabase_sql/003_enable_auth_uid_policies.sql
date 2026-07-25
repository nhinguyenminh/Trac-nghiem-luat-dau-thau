-- PRODUCTION POLICIES WITH SUPABASE AUTH
-- Run this after you verify Supabase Auth login works in app.
-- It removes temporary anon-wide policies and enables owner-only access by auth.uid().

-- profiles
alter table if exists public.profiles enable row level security;
drop policy if exists profiles_select_anon_temp on public.profiles;
drop policy if exists profiles_insert_anon_temp on public.profiles;
drop policy if exists profiles_update_anon_temp on public.profiles;
drop policy if exists profiles_delete_anon_temp on public.profiles;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_own on public.profiles
for select using (auth.uid()::text = user_id::text);
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid()::text = user_id::text);
create policy profiles_update_own on public.profiles
for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy profiles_delete_own on public.profiles
for delete using (auth.uid()::text = user_id::text);

-- question_progress
alter table if exists public.question_progress enable row level security;
drop policy if exists question_progress_select_anon_temp on public.question_progress;
drop policy if exists question_progress_insert_anon_temp on public.question_progress;
drop policy if exists question_progress_update_anon_temp on public.question_progress;
drop policy if exists question_progress_delete_anon_temp on public.question_progress;

drop policy if exists question_progress_select_own on public.question_progress;
drop policy if exists question_progress_insert_own on public.question_progress;
drop policy if exists question_progress_update_own on public.question_progress;
drop policy if exists question_progress_delete_own on public.question_progress;

create policy question_progress_select_own on public.question_progress
for select using (auth.uid()::text = user_id::text);
create policy question_progress_insert_own on public.question_progress
for insert with check (auth.uid()::text = user_id::text);
create policy question_progress_update_own on public.question_progress
for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy question_progress_delete_own on public.question_progress
for delete using (auth.uid()::text = user_id::text);

-- stats
alter table if exists public.stats enable row level security;
drop policy if exists stats_select_anon_temp on public.stats;
drop policy if exists stats_insert_anon_temp on public.stats;
drop policy if exists stats_update_anon_temp on public.stats;
drop policy if exists stats_delete_anon_temp on public.stats;

drop policy if exists stats_select_own on public.stats;
drop policy if exists stats_insert_own on public.stats;
drop policy if exists stats_update_own on public.stats;
drop policy if exists stats_delete_own on public.stats;

create policy stats_select_own on public.stats
for select using (auth.uid()::text = user_id::text);
create policy stats_insert_own on public.stats
for insert with check (auth.uid()::text = user_id::text);
create policy stats_update_own on public.stats
for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy stats_delete_own on public.stats
for delete using (auth.uid()::text = user_id::text);

-- settings
alter table if exists public.settings enable row level security;
drop policy if exists settings_select_anon_temp on public.settings;
drop policy if exists settings_insert_anon_temp on public.settings;
drop policy if exists settings_update_anon_temp on public.settings;
drop policy if exists settings_delete_anon_temp on public.settings;

drop policy if exists settings_select_own on public.settings;
drop policy if exists settings_insert_own on public.settings;
drop policy if exists settings_update_own on public.settings;
drop policy if exists settings_delete_own on public.settings;

create policy settings_select_own on public.settings
for select using (auth.uid()::text = user_id::text);
create policy settings_insert_own on public.settings
for insert with check (auth.uid()::text = user_id::text);
create policy settings_update_own on public.settings
for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy settings_delete_own on public.settings
for delete using (auth.uid()::text = user_id::text);
