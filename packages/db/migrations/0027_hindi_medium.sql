-- v51: Hindi-medium mock tests. A translation of a question's text lives in its own table so the English bank is never touched.
-- MCQ options keep the SAME ORDER as the English options (the answer a student picks is still stored as the English value,
-- so marking is unchanged). Re-runnable.
create table if not exists question_translations (
  question_id uuid not null references diagnostic_questions(id) on delete cascade,
  lang text not null check (lang in ('hi')),
  prompt text not null,
  options jsonb,                 -- same length and order as the English options
  answer_text text,              -- short-answer questions only: the expected answer in Hindi
  explanation text,
  status text not null default 'ai_translated' check (status in ('ai_translated','teacher_checked','rejected')),
  created_at timestamptz not null default now(),
  primary key (question_id, lang)
);
alter table question_translations enable row level security;
-- No policies: it holds answer text, so it is read and written by server code only.

alter table mock_exams add column if not exists language text not null default 'en';
alter table mock_exams drop constraint if exists mock_exams_language_check;
alter table mock_exams add constraint mock_exams_language_check check (language in ('en','hi'));
