-- v35: timed mock exams (objective-style practice papers).
-- Re-runnable. A mock exam is a fixed list of question ids picked when the
-- exam starts, a server-set deadline, the student's autosaved answers, and the
-- graded result. It never touches mastery_states: a mock is a practice
-- measurement, not learning evidence.
--
-- Writes (start / autosave / submit) happen only through server routes that use
-- the service client with a student id derived from the session, so the student
-- cannot edit their own deadline, score or result from the browser. Students may
-- only READ their own exams (RLS below).

create table if not exists mock_exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id),
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  duration_minutes smallint not null check (duration_minutes between 5 and 240),
  question_ids jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  score smallint,
  total smallint,
  result jsonb
);
create index if not exists idx_mock_exams_student on mock_exams(student_id, started_at desc);

alter table mock_exams enable row level security;
drop policy if exists mock_exams_owner_read on mock_exams;
create policy mock_exams_owner_read on mock_exams
  for select using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );
-- Deliberately no insert/update/delete policy: only the server (service role) writes.
