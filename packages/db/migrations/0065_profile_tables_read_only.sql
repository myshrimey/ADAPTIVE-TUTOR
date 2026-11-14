-- v129: a signed-in account can read, but no longer write, its own profile details and school history directly.
-- Additive-safe (replaces two broad rules by read-only ones) and re-runnable.
-- 0007 gave a student a `for all` rule on student_profile_details and student_academic_history. The website now saves
-- both only through the server's own key after it has worked out the student id from the session (/api/profile, v129, t129).
-- Reading your own rows is unchanged. With no write rule left, a direct write from the browser is refused.
drop policy if exists student_profile_details_owner on student_profile_details;
drop policy if exists student_profile_details_select_own on student_profile_details;
create policy student_profile_details_select_own on student_profile_details
  for select to authenticated
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

drop policy if exists student_academic_history_owner on student_academic_history;
drop policy if exists student_academic_history_select_own on student_academic_history;
create policy student_academic_history_select_own on student_academic_history
  for select to authenticated
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-14', 'v129', 'A signed-in account can no longer write its own profile details or school history directly', 'Security: the website saves these only through the server key; the broad write rules were unused', '0065 profile_tables_read_only (two rules replaced by read-only rules; no tables or columns changed)', 'none', 'Deploy the v129 website FIRST, then run 0065. Then save a profile once to check it. Reading your own profile is unchanged.'
where not exists (select 1 from system_changelog where version = 'v129' and change like 'A signed-in account can no longer write its own profile%');
