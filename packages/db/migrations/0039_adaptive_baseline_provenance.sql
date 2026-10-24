-- v62: Adaptive diagnostic and baseline engine (competency graph across classes, evidence, baselines, learning paths)
--      + question provenance (who uploaded / reviewed / asked for each question) + question requests.
-- Re-runnable. Every new table is server-written (RLS on, no policies) except where noted.

-- 1. Competency graph ---------------------------------------------------------------------------------------------
create table if not exists competencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  board text not null default 'CBSE',
  subject_id uuid references subjects(id) on delete cascade,
  class_level smallint not null,
  chapter text,
  topic text,
  name text not null,
  learning_outcome text,
  description text,
  domain text not null default 'general',
  cognitive_level text not null default 'apply',
  difficulty_min smallint not null default 1,
  difficulty_max smallint not null default 5,
  question_types text[] not null default '{}',
  min_expected_mastery numeric not null default 0.7,
  importance smallint not null default 3,
  skill_id uuid references skills(id) on delete set null,
  language_versions text[] not null default '{en}',
  status text not null default 'needs_review',
  source text not null default 'authored',
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'competencies_status_check') then
    alter table competencies add constraint competencies_status_check check (status in ('draft','needs_review','approved','retired'));
  end if;
end $$;
create index if not exists idx_competencies_subject on competencies (subject_id, class_level);
create index if not exists idx_competencies_skill on competencies (skill_id);

create table if not exists competency_prerequisites (
  id uuid primary key default gen_random_uuid(),
  competency_id uuid not null references competencies(id) on delete cascade,
  requires_competency_id uuid not null references competencies(id) on delete cascade,
  strength text not null default 'hard',
  unique (competency_id, requires_competency_id),
  check (competency_id <> requires_competency_id)
);
create index if not exists idx_comp_prereq_req on competency_prerequisites (requires_competency_id);

create table if not exists target_competency_requirements (
  id uuid primary key default gen_random_uuid(),
  exam_key text not null,
  competency_id uuid not null references competencies(id) on delete cascade,
  importance smallint not null default 3,
  min_mastery numeric not null default 0.7,
  unique (exam_key, competency_id)
);

-- Questions for lower-class (foundation) competencies. Class 10 competencies reuse the existing question tables via skill_id.
create table if not exists baseline_items (
  id uuid primary key default gen_random_uuid(),
  competency_id uuid not null references competencies(id) on delete cascade,
  family text,
  difficulty smallint not null default 2,
  complexity smallint not null default 1,
  question_type text not null default 'mcq',
  prompt text not null,
  options jsonb,
  expected_answer jsonb not null,
  explanation text,
  cognitive_dimension text not null default 'application',
  marks smallint,
  expected_time_seconds smallint,
  language text not null default 'en',
  misconception_tags text[] not null default '{}',
  quality_status text not null default 'AI_GENERATED',
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'baseline_items_quality_check') then
    alter table baseline_items add constraint baseline_items_quality_check check (quality_status in ('DRAFT','AI_GENERATED','AI_REVIEWED','ADMIN_REVIEWED','APPROVED','RETIRED'));
  end if;
end $$;
create index if not exists idx_baseline_items_comp on baseline_items (competency_id, difficulty);

-- 2. Evidence, mastery, decisions, baselines, paths ---------------------------------------------------------------
create table if not exists student_competency_evidence (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  competency_id uuid not null references competencies(id) on delete cascade,
  attempt_id uuid,
  item_table text,
  item_id uuid,
  correct boolean not null,
  partial_score numeric,
  difficulty smallint,
  seconds integer,
  hint_used boolean not null default false,
  error_type text,
  evidence_strength numeric not null default 1,
  source text not null default 'diagnostic',
  created_at timestamptz not null default now()
);
create index if not exists idx_sce_student on student_competency_evidence (student_id, competency_id);

create table if not exists student_competency_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  competency_id uuid not null references competencies(id) on delete cascade,
  alpha numeric not null default 1,
  beta numeric not null default 1,
  mastery numeric not null default 0.5,
  confidence text not null default 'low',
  evidence_count integer not null default 0,
  status text not null default 'insufficient_evidence',
  last_evaluated timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, competency_id)
);

create table if not exists adaptive_decisions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  student_id uuid not null references students(id) on delete cascade,
  step integer not null,
  phase text not null,
  action text not null,
  competency_id uuid,
  item_table text,
  item_id uuid,
  reason text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_adaptive_decisions_attempt on adaptive_decisions (attempt_id, step);

create table if not exists student_baselines (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  version integer not null default 1,
  attempt_id uuid,
  target jsonb,
  profile jsonb,
  overall jsonb,
  gaps jsonb,
  starting_point jsonb,
  confidence text,
  changes jsonb,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id, version)
);

create table if not exists learning_paths (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  baseline_id uuid references student_baselines(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists idx_learning_paths_student on learning_paths (student_id, subject_id, created_at desc);

create table if not exists learning_path_nodes (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references learning_paths(id) on delete cascade,
  seq integer not null,
  competency_id uuid not null references competencies(id) on delete cascade,
  stage text not null,
  reason text not null,
  status text not null default 'todo',
  done_at timestamptz
);
create index if not exists idx_lpn_path on learning_path_nodes (path_id, seq);


-- 2b. Adaptive sessions: one row per baseline run; the whole engine state is kept so a student can continue later -------
create table if not exists baseline_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  kind text not null default 'full',
  status text not null default 'in_progress',
  state jsonb not null,
  current jsonb,
  seen_items jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  baseline_id uuid references student_baselines(id) on delete set null,
  questions_answered integer not null default 0,
  ai_calls integer not null default 0
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'baseline_sessions_status_check') then
    alter table baseline_sessions add constraint baseline_sessions_status_check check (status in ('in_progress','completed','abandoned'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'baseline_sessions_kind_check') then
    alter table baseline_sessions add constraint baseline_sessions_kind_check check (kind in ('full','mini'));
  end if;
end $$;
create index if not exists idx_baseline_sessions_student on baseline_sessions (student_id, subject_id, started_at desc);
alter table baseline_sessions enable row level security;

-- 3. Question provenance + requests -------------------------------------------------------------------------------
create table if not exists question_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references users(id) on delete set null,
  requester_role text not null,
  org_user_id uuid references users(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  skill_id uuid references skills(id) on delete set null,
  topic_text text,
  wanted_count integer not null default 10,
  note text,
  status text not null default 'open',
  fulfilled_count integer not null default 0,
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'question_requests_status_check') then
    alter table question_requests add constraint question_requests_status_check check (status in ('open','in_progress','fulfilled','declined'));
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['questions','diagnostic_questions','baseline_items'] loop
    execute format('alter table %I add column if not exists origin text', t);
    execute format('alter table %I add column if not exists contributed_by uuid references users(id) on delete set null', t);
    execute format('alter table %I add column if not exists contributed_role text', t);
    execute format('alter table %I add column if not exists contributor_org uuid references users(id) on delete set null', t);
    execute format('alter table %I add column if not exists reviewed_by text', t);
    execute format('alter table %I add column if not exists reviewed_at timestamptz', t);
    execute format('alter table %I add column if not exists review_note text', t);
    execute format('alter table %I add column if not exists request_id uuid references question_requests(id) on delete set null', t);
    execute format('alter table %I add column if not exists competency_id uuid references competencies(id) on delete set null', t);
  end loop;
end $$;
-- One-time-safe backfill: only rows whose origin has never been set.
update questions set origin = case when source = 'generated' then 'generated' else 'seed_import' end where origin is null;
update diagnostic_questions set origin = case when source = 'generated' then 'generated' else 'seed_import' end where origin is null;
update baseline_items set origin = 'code_generated' where origin is null;

do $$
declare t text;
begin
  foreach t in array array['questions','diagnostic_questions','baseline_items'] loop
    if not exists (select 1 from pg_constraint where conname = t || '_origin_check') then
      execute format('alter table %I add constraint %I check (origin is null or origin in (''seed_import'',''generated'',''ai_generated'',''code_generated'',''admin_upload'',''teacher_upload'',''tutor_upload'',''centre_upload'',''student_upload'',''previous_paper''))', t, t || '_origin_check');
    end if;
  end loop;
end $$;
create index if not exists idx_questions_origin on questions (origin, content_status);
create index if not exists idx_dq_origin on diagnostic_questions (origin, content_status);

-- 4. Security: server only -------------------------------------------------------------------------------------------
alter table competencies enable row level security;
alter table competency_prerequisites enable row level security;
alter table target_competency_requirements enable row level security;
alter table baseline_items enable row level security;
alter table student_competency_evidence enable row level security;
alter table student_competency_mastery enable row level security;
alter table adaptive_decisions enable row level security;
alter table student_baselines enable row level security;
alter table learning_paths enable row level security;
alter table learning_path_nodes enable row level security;
alter table question_requests enable row level security;

-- 5. Settings (admin diagnostic engine panel) ---------------------------------------------------------------------------
insert into commerce_settings (key, value, note)
select 'diagnostic_engine', '{"mode":"adaptive","min_questions":15,"recommended_min":20,"recommended_max":30,"max_questions":50,"confidence_threshold":0.8,"prereq_depth":3,"session_min_questions":10,"allow_unreviewed":true}'::jsonb, 'v62 adaptive diagnostic defaults'
where not exists (select 1 from commerce_settings where key = 'diagnostic_engine');

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-24', 'v62', 'Adaptive cross-grade diagnostic and baseline engine, question provenance database, 10-question session minimum', 'Founder adaptive diagnostic spec 2026-10-24', 'Migration 0039: competencies, competency_prerequisites, target_competency_requirements, baseline_items, student_competency_evidence/mastery, adaptive_decisions, student_baselines, learning_paths/nodes, question_requests; provenance columns on questions, diagnostic_questions, baseline_items', 'None', 'Run npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v62');
