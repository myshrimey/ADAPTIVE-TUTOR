-- v63: Challenge tier. Olympiad-style and competitive-exam-style questions for strong students, kept apart from the core
-- bank (they never feed mastery or readiness) plus badges for solving them. Re-runnable. "Style" only: these are original
-- questions written in the manner of such exams, never copies of real papers.

alter table questions add column if not exists tier text not null default 'core';
alter table questions add column if not exists exam_style text;
alter table questions add column if not exists stretch_level smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'questions_tier_check') then
    alter table questions add constraint questions_tier_check check (tier in ('core','stretch'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'questions_exam_style_check') then
    alter table questions add constraint questions_exam_style_check check (exam_style is null or exam_style in ('olympiad','ntse','ioqm','jee_foundation','neet_foundation','general_challenge'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'questions_stretch_level_check') then
    alter table questions add constraint questions_stretch_level_check check (stretch_level is null or stretch_level between 1 and 3);
  end if;
end $$;
create index if not exists idx_questions_tier on questions (tier, skill_id) where tier = 'stretch';

-- One row per student per challenge question: each question counts once (no farming a badge by repeating one).
create table if not exists stretch_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  skill_id uuid references skills(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  exam_style text,
  stretch_level smallint,
  correct boolean not null,
  seconds integer,
  answered_at timestamptz not null default now(),
  unique (student_id, question_id)
);
create index if not exists idx_stretch_student on stretch_attempts (student_id, answered_at desc);
alter table stretch_attempts enable row level security;
drop policy if exists stretch_attempts_own_read on stretch_attempts;
create policy stretch_attempts_own_read on stretch_attempts for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- Badges (no XP, no money, no discount): rules on real behaviour, shown on the existing Achievements page.
insert into achievements (code, category, title, description, metric, threshold, xp, sort) values
 ('stretch_first','assessment','First challenge solved','Solved a Challenge-zone question.','stretch_correct',1,0,60),
 ('stretch_10','assessment','Challenge climber','Solved 10 different Challenge-zone questions.','stretch_correct',10,0,61),
 ('stretch_50','assessment','Challenge master','Solved 50 different Challenge-zone questions.','stretch_correct',50,0,62),
 ('stretch_run_3','assessment','Hot streak','Solved 3 Challenge questions in a row.','stretch_best_run',3,0,63),
 ('stretch_run_5','assessment','On fire','Solved 5 Challenge questions in a row.','stretch_best_run',5,0,64),
 ('stretch_top_1','assessment','Top-level thinker','Solved a top-level (level 3) Challenge question.','stretch_level3',1,0,65),
 ('stretch_top_5','assessment','Top-level regular','Solved 5 top-level (level 3) Challenge questions.','stretch_level3',5,0,66),
 ('stretch_explorer','assessment','Challenge explorer','Solved Challenge questions in 2 different exam styles.','stretch_styles',2,0,67),
 ('stretch_all_rounder','assessment','Challenge all-rounder','Solved Challenge questions in 2 different subjects.','stretch_subjects',2,0,68)
on conflict (code) do nothing;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-24', 'v63', 'Challenge zone: olympiad-style and competitive-exam-style questions for strong students, with badges', 'Founder request', '0040 tier/exam_style/stretch_level on questions, stretch_attempts, 9 badges', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v63');
