-- v38: finishing the "partly built" items of the master prompt. Additive and re-runnable.
--   - onboarding fields (exam year, preferred language, daily study time)
--   - question details (marks, expected time, cognitive level, language) + academic year on curricula
--   - teacher can suggest marks / cognitive level
--   - more likely-cause tags (Science and Language wording)
--   - recovery_events (a recorded event when a gentler session starts)
--   - staged assessments: mock exams get a "kind" (full mock, subject check, chapter check,
--     board-style paper); diagnostics can be limited to one chapter
--   - subject quality-gate sign-offs (founder-only)

-- 1. Onboarding / profile --------------------------------------------------------------
alter table learning_profiles add column if not exists exam_year smallint not null default 2027;
alter table learning_profiles add column if not exists preferred_language text;
alter table learning_profiles add column if not exists daily_study_minutes smallint;
alter table learning_profiles drop constraint if exists learning_profiles_preferred_language_check;
alter table learning_profiles add constraint learning_profiles_preferred_language_check check (preferred_language is null or preferred_language in ('en','hi'));
alter table learning_profiles drop constraint if exists learning_profiles_daily_study_minutes_check;
alter table learning_profiles add constraint learning_profiles_daily_study_minutes_check check (daily_study_minutes is null or daily_study_minutes between 5 and 480);

alter table curricula add column if not exists academic_year smallint not null default 2027;

-- 2. Question details ------------------------------------------------------------------
-- marks and cognitive_level stay NULL (= not classified yet) until a person sets them; only
-- language ('en') and a planning default for expected time are filled automatically.
do $$
declare t text;
begin
  foreach t in array array['questions','diagnostic_questions'] loop
    execute format('alter table %I add column if not exists marks smallint', t);
    execute format('alter table %I add column if not exists expected_time_seconds smallint', t);
    execute format('alter table %I add column if not exists cognitive_level text', t);
    execute format('alter table %I add column if not exists language text not null default %L', t, 'en');
    execute format('alter table %I drop constraint if exists %I', t, t || '_marks_check');
    execute format('alter table %I add constraint %I check (marks is null or marks between 1 and 20)', t, t || '_marks_check');
    execute format('alter table %I drop constraint if exists %I', t, t || '_exptime_check');
    execute format('alter table %I add constraint %I check (expected_time_seconds is null or expected_time_seconds between 5 and 1800)', t, t || '_exptime_check');
    execute format('alter table %I drop constraint if exists %I', t, t || '_cognitive_check');
    execute format('alter table %I add constraint %I check (cognitive_level is null or cognitive_level in (%L,%L,%L,%L))', t, t || '_cognitive_check', 'recall', 'understand', 'apply', 'analyse');
    execute format('alter table %I drop constraint if exists %I', t, t || '_language_check');
    execute format('alter table %I add constraint %I check (language in (%L,%L))', t, t || '_language_check', 'en', 'hi');
    -- Planning default only (not a measured time): fills rows that have no value yet.
    execute format('update %I set expected_time_seconds = case question_type when %L then 60 when %L then 120 else 120 end where expected_time_seconds is null', t, 'mcq', 'numeric');
  end loop;
end $$;

alter table content_reviews add column if not exists suggested_marks smallint;
alter table content_reviews add column if not exists suggested_cognitive_level text;
alter table content_reviews drop constraint if exists content_reviews_suggested_cognitive_check;
alter table content_reviews add constraint content_reviews_suggested_cognitive_check check (suggested_cognitive_level is null or suggested_cognitive_level in ('recall','understand','apply','analyse'));
alter table content_reviews drop constraint if exists content_reviews_suggested_marks_check;
alter table content_reviews add constraint content_reviews_suggested_marks_check check (suggested_marks is null or suggested_marks between 1 and 20);

-- 3. Likely-cause tags -------------------------------------------------------------------
alter table misconceptions drop constraint if exists misconceptions_tag_check;
alter table misconceptions add constraint misconceptions_tag_check check (tag in (
  'SIGN_ERROR','ALGEBRAIC_MANIPULATION','FORMULA_MISUSE','CONCEPT_CONFUSION',
  'PROCEDURAL_ERROR','ARITHMETIC_ERROR','PREREQUISITE_GAP','INCOMPLETE_REASONING',
  'TERMINOLOGY_CONFUSION','APPLICATION_GAP','QUESTION_INTERPRETATION','ATTENTION_SLIP',
  'COMPREHENSION_GAP','GRAMMAR_RULE','VOCABULARY_GAP','STRUCTURE_FORMAT','WRITTEN_EXPRESSION','INCOMPLETE_ANSWER'
));

-- 4. Recovery events ------------------------------------------------------------------------
create table if not exists recovery_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  session_id uuid references learning_sessions(id) on delete cascade,
  trigger text not null check (trigger in ('self_report','performance')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_recovery_events_student on recovery_events(student_id, created_at desc);
drop index if exists idx_recovery_events_session;
create unique index if not exists idx_recovery_events_session_trigger on recovery_events(session_id, trigger) where session_id is not null;
alter table recovery_events enable row level security;
drop policy if exists recovery_events_owner_read on recovery_events;
create policy recovery_events_owner_read on recovery_events
  for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));
drop policy if exists recovery_events_owner_insert on recovery_events;
create policy recovery_events_owner_insert on recovery_events
  for insert with check (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- 4b. When the current question was shown (server clock) so answer time is measured on the server.
alter table learning_sessions add column if not exists active_question_posed_at timestamptz;

-- 5. Staged assessments ----------------------------------------------------------------------
alter table mock_exams add column if not exists kind text not null default 'full_mock';
alter table mock_exams add column if not exists chapter_id uuid references chapters(id);
alter table mock_exams drop constraint if exists mock_exams_kind_check;
alter table mock_exams add constraint mock_exams_kind_check check (kind in ('full_mock','subject_check','chapter_check','board_style'));
-- score/total on a board-style paper are MARKS; elsewhere they are question counts (1 mark each).

alter table diagnostic_attempts add column if not exists chapter_id uuid references chapters(id);

-- 6. Subject quality gates (founder sign-off; server writes only) ---------------------------------
create table if not exists subject_gate_signoffs (
  subject_id uuid not null references subjects(id) on delete cascade,
  gate smallint not null check (gate between 1 and 10),
  passed boolean not null default false,
  note text,
  signed_by text,
  updated_at timestamptz not null default now(),
  primary key (subject_id, gate)
);
alter table subject_gate_signoffs enable row level security;
-- No policies: only the service key (admin routes) reads or writes this table.
