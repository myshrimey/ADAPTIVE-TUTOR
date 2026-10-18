-- v49: every diagnostic, quick quiz and mock/paper is saved as a dated report. Two versions are written for each test:
--   audience 'student': the full question-by-question review. The student reads this (RLS owner read).
--   audience 'adult'  : a short summary for parents, tutors and centres. NO policy at all: students (and every
--                       other signed-in user) cannot read it. Only server code that has checked an active
--                       student_links row reads it with the service key.
-- Re-runnable.
create table if not exists test_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null check (kind in ('diagnostic','skill_quiz','mock')),
  audience text not null check (audience in ('student','adult')),
  source_id uuid not null,                 -- the attempt / exam / quiz this report is about
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  taken_at timestamptz not null default now(),
  score numeric,
  total numeric,
  in_marks boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (student_id, kind, source_id, audience)
);
create index if not exists idx_test_reports_student on test_reports(student_id, audience, taken_at desc);
alter table test_reports enable row level security;
drop policy if exists test_reports_student_read on test_reports;
create policy test_reports_student_read on test_reports
  for select using (
    audience = 'student'
    and student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid())
  );
-- No insert/update/delete policies: written by server routes only.
