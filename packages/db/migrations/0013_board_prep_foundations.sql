-- v34: foundations for the "Sahayak Complete Board Preparation" offer.
-- Re-runnable (every migration file re-runs on `npm run db:migrate`), so every
-- statement is guarded: `if not exists`, drop-then-create for policies/checks,
-- and the one-time backfills only run when their column is first created.
--
-- 1. Subject catalogue + readiness status (master prompt sec. 6).
-- 2. Content verification status per question (sec. 8).
-- 3. Pre-session check-ins + confidence tracking (sec. 13-17).
-- 4. 'refunded' payment status + purchase offer label (sec. 28).

-- ---------------------------------------------------------------- 1. subjects
alter table subjects
  add column if not exists status text not null default 'ready'
    check (status in ('ready','pilot','in_development','coming_soon')),
  add column if not exists description text;

-- Social Science already had seeded content but a thin bank; it is a pilot
-- subject, not a fully-supported one. Maths and Science stay 'ready'.
-- (New English / Hindi / Computer Applications rows set 'pilot' in their seed files.)
update subjects set status = 'pilot'
  where slug = 'social-science' and status = 'ready'
    and description is null;
update subjects set description = 'Pilot subject: content is still being reviewed — see CONTENT_STATUS.md.'
  where slug = 'social-science' and description is null;

-- Which registered subject the student is currently working in. The learner
-- model used to pick "the most recently created active goal"; with several
-- registered subjects the student needs to be able to switch, so we track when
-- each goal was last made the active one.
alter table learning_goals add column if not exists activated_at timestamptz not null default now();

-- ------------------------------------------------- 2. content verification status
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'questions' and column_name = 'content_status') then
    alter table questions
      add column content_status text not null default 'verified'
        check (content_status in ('verified','needs_review','rejected'));
    -- One-time backfill: anything AI-generated is unreviewed until a human says otherwise.
    update questions set content_status = 'needs_review' where source = 'generated';
    -- Anything belonging to a non-'ready' subject is unreviewed too.
    update questions q set content_status = 'needs_review'
      from skills sk, topics tp, chapters ch, subjects su
      where q.skill_id = sk.id and sk.topic_id = tp.id and tp.chapter_id = ch.id
        and ch.subject_id = su.id and su.status <> 'ready';
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_name = 'diagnostic_questions' and column_name = 'content_status') then
    alter table diagnostic_questions
      add column content_status text not null default 'verified'
        check (content_status in ('verified','needs_review','rejected'));
    update diagnostic_questions set content_status = 'needs_review' where source = 'generated';
    update diagnostic_questions d set content_status = 'needs_review'
      from skills sk, topics tp, chapters ch, subjects su
      where d.skill_id = sk.id and sk.topic_id = tp.id and tp.chapter_id = ch.id
        and ch.subject_id = su.id and su.status <> 'ready';
  end if;
end $$;

-- ---------------------------------------------------------- 3. session check-ins
-- One row per learning session. Self-reported context (mood/focus/confidence)
-- is stored SEPARATELY from academic evidence (mastery_states, question_attempts):
-- "context affects the intervention; evidence determines the academic assessment".
create table if not exists session_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  session_id uuid references learning_sessions(id) on delete cascade,
  skill_id uuid references skills(id) on delete set null,
  mood text check (mood in ('very_good','good','okay','not_great','tired','stressed')),
  focus text check (focus in ('very_focused','mostly_focused','a_little_distracted','very_distracted')),
  confidence_before smallint check (confidence_before between 0 and 10),
  confidence_after smallint check (confidence_after between 0 and 10),
  available_minutes smallint check (available_minutes between 1 and 240),
  session_goal text check (session_goal in ('learn','practise','revise','fix_mistakes','test_myself')),
  recovery_mode boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_checkins_student on session_checkins(student_id, created_at desc);
create index if not exists idx_checkins_session on session_checkins(session_id);

alter table session_checkins enable row level security;
drop policy if exists session_checkins_owner on session_checkins;
create policy session_checkins_owner on session_checkins
  for all using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------ 4. payments
alter table pilot_payments drop constraint if exists pilot_payments_status_check;
alter table pilot_payments
  add constraint pilot_payments_status_check
  check (status in ('pending','confirmed','rejected','refunded'));
