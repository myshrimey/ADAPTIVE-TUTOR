-- v130: a signed-in account can read, but no longer write, its own learning profile, subject goals and session check-ins directly.
-- Additive-safe (replaces three broad rules by read-only ones) and re-runnable.
-- 0002 and 0013 gave a student a `for all` rule on each table. The website now writes all three only through the server's
-- own key, after the student id is taken from the sign-in (v130, t130). Reading your own rows is unchanged.
drop policy if exists learning_profiles_owner on learning_profiles;
drop policy if exists learning_profiles_select_own on learning_profiles;
create policy learning_profiles_select_own on learning_profiles
  for select to authenticated
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

drop policy if exists learning_goals_owner on learning_goals;
drop policy if exists learning_goals_select_own on learning_goals;
create policy learning_goals_select_own on learning_goals
  for select to authenticated
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

drop policy if exists session_checkins_owner on session_checkins;
drop policy if exists session_checkins_select_own on session_checkins;
create policy session_checkins_select_own on session_checkins
  for select to authenticated
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-14', 'v130', 'A signed-in account can no longer write its own learning profile, subject goals or check-ins directly', 'Security: the website writes these only through the server key; the broad write rules were unused', '0066 learning_tables_read_only (three rules replaced by read-only rules; no tables or columns changed)', 'none', 'Deploy the v130 website FIRST, then run 0066. Then start a lesson with a check-in and pick a subject once to check. Reading your own data is unchanged.'
where not exists (select 1 from system_changelog where version = 'v130' and change like 'A signed-in account can no longer write its own learning profile%');
