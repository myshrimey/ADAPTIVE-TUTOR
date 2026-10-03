-- Adaptive AI Tutor — MVP schema
-- Run against Supabase Postgres. Requires pgcrypto for gen_random_uuid() (enabled by default on Supabase).

-- ===================== USERS & STUDENTS =====================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('student','parent','admin')),
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  display_name text not null,
  grade text,
  date_of_birth date,
  created_at timestamptz not null default now()
);
create index if not exists idx_students_user on students(user_id);

-- ===================== CURRICULUM (created before profiles/goals, which reference it) ====

create table if not exists curricula (
  id uuid primary key default gen_random_uuid(),
  board text not null,
  class text not null,
  version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique(board, class, version)
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  name text not null,
  slug text not null,
  unique(curriculum_id, slug)
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  sequence int not null,
  unique(subject_id, slug)
);
create index if not exists idx_chapters_subject on chapters(subject_id);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null,
  slug text not null,
  sequence int not null,
  unique(chapter_id, slug)
);
create index if not exists idx_topics_chapter on topics(chapter_id);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  name text not null,
  slug text not null,
  unique(topic_id, slug)
);
create index if not exists idx_skills_topic on skills(topic_id);

create table if not exists prerequisites (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id) on delete cascade,
  requires_skill_id uuid not null references skills(id) on delete cascade,
  strength text not null default 'hard' check (strength in ('hard','soft')),
  unique(skill_id, requires_skill_id),
  check (skill_id <> requires_skill_id)
);
create index if not exists idx_prereq_skill on prerequisites(skill_id);

-- ===================== PROFILES & GOALS =====================

create table if not exists learning_profiles (
  student_id uuid primary key references students(id) on delete cascade,
  preferred_pace text,
  preference_evidence jsonb not null default '{}',
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists learning_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  curriculum_id uuid not null references curricula(id),
  -- Which subject within the curriculum this goal targets. Nullable because a
  -- curriculum can (and now does) hold more than one subject — added when a
  -- second subject (Science) was seeded alongside Maths; a null here means a
  -- pre-existing row from before subjects were distinguished, and callers
  -- fall back to the curriculum's first subject for those (see
  -- learner-state.service.ts's loadLearnerState).
  subject_id uuid references subjects(id),
  target_date date,
  status text not null default 'active' check (status in ('active','paused','completed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_goals_student on learning_goals(student_id);

-- ===================== DIAGNOSTIC =====================

create table if not exists diagnostic_tests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_questions (
  id uuid primary key default gen_random_uuid(),
  diagnostic_test_id uuid not null references diagnostic_tests(id) on delete cascade,
  skill_id uuid not null references skills(id),
  difficulty smallint not null check (difficulty between 1 and 5),
  question_type text not null check (question_type in ('mcq','short_answer','numeric')),
  prompt text not null,
  options jsonb,
  expected_answer jsonb not null,
  misconception_tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_diag_q_skill on diagnostic_questions(skill_id);

create table if not exists diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  diagnostic_test_id uuid not null references diagnostic_tests(id),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb
);
create index if not exists idx_diag_attempt_student on diagnostic_attempts(student_id);

create table if not exists diagnostic_answers (
  id uuid primary key default gen_random_uuid(),
  diagnostic_attempt_id uuid not null references diagnostic_attempts(id) on delete cascade,
  diagnostic_question_id uuid not null references diagnostic_questions(id),
  answer jsonb not null,
  is_correct boolean not null,
  responded_at timestamptz not null default now()
);
create index if not exists idx_diag_answers_attempt on diagnostic_answers(diagnostic_attempt_id);

-- ===================== MASTERY =====================

create table if not exists mastery_states (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid not null references skills(id),
  score numeric(5,2) not null default 0 check (score between 0 and 100),
  band text not null default 'needs_foundation'
    check (band in ('needs_foundation','emerging','developing','strong','mastered')),
  component_scores jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique(student_id, skill_id)
);
create index if not exists idx_mastery_student on mastery_states(student_id);

-- ===================== SESSIONS (before question_attempts, which references it) =========

create table if not exists learning_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid not null references skills(id),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  starting_mastery numeric(5,2),
  ending_mastery numeric(5,2),
  summary jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_sessions_student on learning_sessions(student_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references learning_sessions(id) on delete cascade,
  role text not null check (role in ('tutor','student','system')),
  content text not null,
  strategy text,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_session on messages(session_id);

-- ===================== MISCONCEPTIONS (before questions/question_attempts) ===============

create table if not exists misconceptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid references skills(id),
  tag text not null check (tag in (
    'SIGN_ERROR','ALGEBRAIC_MANIPULATION','FORMULA_MISUSE','CONCEPT_CONFUSION',
    'PROCEDURAL_ERROR','ARITHMETIC_ERROR','PREREQUISITE_GAP','INCOMPLETE_REASONING'
  )),
  confidence numeric(3,2) not null check (confidence between 0 and 1),
  first_detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved boolean not null default false
);
create index if not exists idx_misconceptions_student on misconceptions(student_id);

-- ===================== QUESTIONS & ATTEMPTS =====================

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id),
  source text not null default 'generated' check (source in ('generated','bank')),
  difficulty smallint not null check (difficulty between 1 and 5),
  question_type text not null check (question_type in ('mcq','short_answer','numeric','step')),
  prompt text not null,
  options jsonb,
  expected_answer jsonb not null,
  misconception_tags text[] default '{}',
  validated boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_questions_skill on questions(skill_id);

create table if not exists question_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references questions(id),
  session_id uuid references learning_sessions(id) on delete set null,
  answer jsonb not null,
  is_correct boolean not null,
  hints_used int not null default 0,
  time_taken_seconds int,
  detected_misconception_id uuid references misconceptions(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_qattempt_student on question_attempts(student_id);
create index if not exists idx_qattempt_session on question_attempts(session_id);

-- learning_sessions needs to track which question is currently "live" so a
-- later /session/answer call knows what it's grading against. Added here
-- (rather than inline on the table above) because `questions` doesn't exist
-- yet at that point in the file — this table ordering keeps every FK forward-
-- referencing nothing, which is what lets `create table if not exists` be run
-- top-to-bottom idempotently.
alter table learning_sessions add column if not exists active_question_id uuid references questions(id) on delete set null;

-- Tracks hints requested for whichever question is currently active, so
-- question_attempts.hints_used (which mastery.service.ts's "independent
-- performance" component depends on) reflects real hint usage instead of
-- always being 0. Reset to 0 whenever active_question_id changes.
alter table learning_sessions add column if not exists hint_count_for_active_question int not null default 0;

-- ===================== EVENTS (analytics) =====================

create table if not exists learning_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  session_id uuid references learning_sessions(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_events_student on learning_events(student_id);
create index if not exists idx_events_type on learning_events(event_type);

-- Enable RLS on every student-owned table now; policies are defined in
-- migrations/0002_rls_policies.sql (kept separate so this file stays pure DDL).
alter table users enable row level security;
alter table students enable row level security;
alter table learning_profiles enable row level security;
alter table learning_goals enable row level security;
alter table diagnostic_attempts enable row level security;
alter table diagnostic_answers enable row level security;
alter table mastery_states enable row level security;
alter table question_attempts enable row level security;
alter table misconceptions enable row level security;
alter table learning_sessions enable row level security;
alter table messages enable row level security;
alter table learning_events enable row level security;

-- Curriculum + question-bank tables are readable by any authenticated user;
-- no RLS needed on their content beyond a broad select policy (see 0002).
