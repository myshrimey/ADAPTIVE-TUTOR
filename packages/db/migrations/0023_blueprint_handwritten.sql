-- v45-v46: blueprint papers (print and write on paper), photos of handwritten answers, AI + teacher marking.
-- Re-runnable.

-- 1. Mock exams: blueprint kind, delivery (screen / paper), challenge flag, saved layout and validation
alter table mock_exams add column if not exists delivery text not null default 'screen';
alter table mock_exams add column if not exists challenge boolean not null default false;
alter table mock_exams add column if not exists blueprint_id text;
alter table mock_exams add column if not exists paper_layout jsonb;
alter table mock_exams add column if not exists validation jsonb;
alter table mock_exams drop constraint if exists mock_exams_delivery_check;
alter table mock_exams add constraint mock_exams_delivery_check check (delivery in ('screen','paper'));
alter table mock_exams drop constraint if exists mock_exams_kind_check;
alter table mock_exams add constraint mock_exams_kind_check check (kind in ('full_mock','subject_check','chapter_check','board_style','blueprint'));

-- 2. Parent consent for photos of handwritten answers (written by the server only)
alter table students add column if not exists handwriting_consent_at timestamptz;
alter table students add column if not exists handwriting_consent_version text;
alter table students add column if not exists answer_bank_consent boolean not null default false;

-- 3. Answer-sheet photos (files live in the private storage bucket "answer-sheets")
create table if not exists answer_sheets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  mock_exam_id uuid not null references mock_exams(id) on delete cascade,
  page_no smallint not null,
  storage_path text not null,
  content_type text,
  bytes integer,
  quality jsonb not null default '{}'::jsonb,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  unique (mock_exam_id, page_no)
);
alter table answer_sheets drop constraint if exists answer_sheets_status_check;
alter table answer_sheets add constraint answer_sheets_status_check check (status in ('uploaded','rejected_quality','read'));
create index if not exists idx_answer_sheets_exam on answer_sheets(mock_exam_id);
alter table answer_sheets enable row level security;
drop policy if exists answer_sheets_owner_read on answer_sheets;
create policy answer_sheets_owner_read on answer_sheets for select
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- 4. Marks for handwritten answers: AI first, teacher when unsure
create table if not exists handwritten_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  mock_exam_id uuid not null references mock_exams(id) on delete cascade,
  question_id uuid not null,
  question_no smallint,
  extracted_text text,
  ai_score smallint,
  max_score smallint not null,
  confidence text not null default 'low',
  ai_feedback text,
  status text not null default 'ai_marked',
  teacher_score smallint,
  teacher_note text,
  teacher_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mock_exam_id, question_id)
);
alter table handwritten_evaluations drop constraint if exists handwritten_evaluations_status_check;
alter table handwritten_evaluations add constraint handwritten_evaluations_status_check check (status in ('ai_marked','needs_teacher','teacher_done','unreadable'));
alter table handwritten_evaluations drop constraint if exists handwritten_evaluations_conf_check;
alter table handwritten_evaluations add constraint handwritten_evaluations_conf_check check (confidence in ('high','medium','low'));
create index if not exists idx_hw_eval_status on handwritten_evaluations(status, created_at);
alter table handwritten_evaluations enable row level security;
drop policy if exists handwritten_evaluations_owner_read on handwritten_evaluations;
create policy handwritten_evaluations_owner_read on handwritten_evaluations for select
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- 5. Question/answer bank kept after a family deletes their account (ONLY with the family's separate consent and
--    only when the founder switches ANSWER_BANK_ENABLED on in code). No student id, name or email is stored here.
create table if not exists answer_bank (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid,
  question_id uuid,
  extracted_text text,
  score smallint,
  max_score smallint,
  photo_path text,
  created_at timestamptz not null default now()
);
alter table answer_bank enable row level security; -- server only: no policy on purpose

-- 6. Private storage bucket for the photos (only where Supabase storage exists)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('answer-sheets', 'answer-sheets', false) on conflict (id) do nothing;
  end if;
end $$;
