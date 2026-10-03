-- RLS policies. Run after schema.sql.
-- Pattern: a student can only see/modify rows that trace back to their own auth.uid()
-- via users.auth_user_id -> users.id -> students.user_id -> students.id.
--
-- Every `create policy` is preceded by a matching `drop policy if exists` —
-- Postgres has no `create policy if not exists`, so without this guard,
-- re-running this file against an already-migrated database (e.g. a repeated
-- deploy, per docs/deployment.md's "all three are idempotent" claim) fails
-- with "policy already exists" on the very first statement. Verified live
-- against a real Postgres instance: this file now applies cleanly both on a
-- fresh database and when re-run against one it's already been applied to.

-- ---- users ----
drop policy if exists users_select_own on users;
create policy users_select_own on users
  for select using (auth_user_id = auth.uid());
drop policy if exists users_update_own on users;
create policy users_update_own on users
  for update using (auth_user_id = auth.uid());

-- ---- students ----
drop policy if exists students_select_own on students;
create policy students_select_own on students
  for select using (
    user_id in (select id from users where auth_user_id = auth.uid())
  );
drop policy if exists students_update_own on students;
create policy students_update_own on students
  for update using (
    user_id in (select id from users where auth_user_id = auth.uid())
  );

-- Helper pattern reused below: student_id in (select id from students where user_id in (...))
-- Written out per table rather than as a function, to keep the MVP's SQL surface easy to audit.

drop policy if exists learning_profiles_owner on learning_profiles;
create policy learning_profiles_owner on learning_profiles
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists learning_goals_owner on learning_goals;
create policy learning_goals_owner on learning_goals
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists diagnostic_attempts_owner on diagnostic_attempts;
create policy diagnostic_attempts_owner on diagnostic_attempts
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists diagnostic_answers_owner on diagnostic_answers;
create policy diagnostic_answers_owner on diagnostic_answers
  for all using (
    diagnostic_attempt_id in (
      select da.id from diagnostic_attempts da
      join students s on s.id = da.student_id
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists mastery_states_owner on mastery_states;
create policy mastery_states_owner on mastery_states
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists question_attempts_owner on question_attempts;
create policy question_attempts_owner on question_attempts
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists misconceptions_owner on misconceptions;
create policy misconceptions_owner on misconceptions
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists learning_sessions_owner on learning_sessions;
create policy learning_sessions_owner on learning_sessions
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists messages_owner on messages;
create policy messages_owner on messages
  for all using (
    session_id in (
      select ls.id from learning_sessions ls
      join students s on s.id = ls.student_id
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists learning_events_owner on learning_events;
create policy learning_events_owner on learning_events
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

-- ---- curriculum + question-bank content: readable by any authenticated user ----
alter table curricula enable row level security;
alter table subjects enable row level security;
alter table chapters enable row level security;
alter table topics enable row level security;
alter table skills enable row level security;
alter table prerequisites enable row level security;
alter table diagnostic_tests enable row level security;
alter table diagnostic_questions enable row level security;
alter table questions enable row level security;

drop policy if exists curricula_read_all on curricula;
create policy curricula_read_all on curricula for select using (auth.role() = 'authenticated');
drop policy if exists subjects_read_all on subjects;
create policy subjects_read_all on subjects for select using (auth.role() = 'authenticated');
drop policy if exists chapters_read_all on chapters;
create policy chapters_read_all on chapters for select using (auth.role() = 'authenticated');
drop policy if exists topics_read_all on topics;
create policy topics_read_all on topics for select using (auth.role() = 'authenticated');
drop policy if exists skills_read_all on skills;
create policy skills_read_all on skills for select using (auth.role() = 'authenticated');
drop policy if exists prerequisites_read_all on prerequisites;
create policy prerequisites_read_all on prerequisites for select using (auth.role() = 'authenticated');
drop policy if exists diagnostic_tests_read_all on diagnostic_tests;
create policy diagnostic_tests_read_all on diagnostic_tests for select using (auth.role() = 'authenticated');
drop policy if exists diagnostic_questions_read_all on diagnostic_questions;
create policy diagnostic_questions_read_all on diagnostic_questions for select using (auth.role() = 'authenticated');
drop policy if exists questions_read_all on questions;
create policy questions_read_all on questions for select using (auth.role() = 'authenticated');

-- Writes to curriculum/question-bank tables happen only via the service-role key
-- (seed scripts, admin tooling) — no insert/update/delete policy needed for
-- authenticated users in the MVP.

-- Writes to mastery_states, question_attempts, misconceptions, learning_events are
-- performed server-side with the service-role key (bypasses RLS) since they're
-- derived by the orchestrator, not submitted directly by the client. The owner
-- policies above still gate client-side reads.
