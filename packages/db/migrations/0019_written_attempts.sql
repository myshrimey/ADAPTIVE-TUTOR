-- v40: written-answer practice. A student's own written answer, the AI's suggested marks and
-- feedback. Owner read only; written by the server. Never feeds mastery.
create table if not exists written_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references diagnostic_questions(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 1500),
  score smallint not null check (score >= 0),
  max_score smallint not null check (max_score between 1 and 20),
  key_points jsonb not null default '[]'::jsonb,
  feedback text,
  created_at timestamptz not null default now(),
  check (score <= max_score)
);
create index if not exists idx_written_attempts_student on written_attempts(student_id, created_at desc);
alter table written_attempts enable row level security;
drop policy if exists written_attempts_owner_read on written_attempts;
create policy written_attempts_owner_read on written_attempts
  for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));
-- No insert/update/delete policy: only the server (service key) writes, so a score cannot be edited from the browser.
