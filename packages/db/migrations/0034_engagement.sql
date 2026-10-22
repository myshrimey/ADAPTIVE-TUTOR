-- v57 Student Engagement & Retention Engine. Re-runnable. Students may READ their own rows; every write is made by the server.
-- Settings (XP values, mission size, feature switches, experiments) live in commerce_settings key 'engagement' (no new settings table).

create table if not exists student_engagement (
  student_id uuid primary key references students(id) on delete cascade,
  xp_total integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_day date,
  nickname text,
  leaderboard_opt_in boolean not null default false,
  sync_cursor timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_student_engagement_nickname on student_engagement (lower(nickname)) where nickname is not null;

create table if not exists xp_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  amount integer not null,
  kind text not null,
  ref text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, ref)
);
create index if not exists idx_xp_student_time on xp_transactions (student_id, created_at desc);

create table if not exists engagement_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null,
  ref text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_engagement_events_kind on engagement_events (kind, created_at desc);
create index if not exists idx_engagement_events_student on engagement_events (student_id, created_at desc);

create table if not exists daily_missions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  day date not null,
  title text not null,
  status text not null default 'open' check (status in ('open','complete')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, day)
);
create table if not exists mission_items (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references daily_missions(id) on delete cascade,
  position integer not null default 0,
  kind text not null,
  label text not null,
  target integer not null default 1,
  progress integer not null default 0,
  done boolean not null default false,
  subject_id uuid references subjects(id) on delete set null,
  skill_id uuid references skills(id) on delete set null,
  href text
);
create index if not exists idx_mission_items_mission on mission_items (mission_id);

create table if not exists achievements (
  code text primary key,
  category text not null check (category in ('consistency','learning','improvement','assessment','mistakes','cbse')),
  title text not null,
  description text not null,
  metric text not null,
  threshold numeric not null,
  xp integer not null default 0,
  sort integer not null default 0,
  active boolean not null default true
);
create table if not exists student_achievements (
  student_id uuid not null references students(id) on delete cascade,
  code text not null references achievements(code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  primary key (student_id, code)
);

create table if not exists personal_bests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null,
  scope_id text not null default '',
  value numeric not null,
  previous_value numeric,
  achieved_at timestamptz not null default now(),
  unique (student_id, kind, scope_id)
);

create table if not exists mistake_book (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_table text not null default 'diagnostic_questions' check (question_table in ('diagnostic_questions','questions')),
  question_id uuid not null,
  skill_id uuid references skills(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  chapter_id uuid references chapters(id) on delete set null,
  student_answer text,
  correct_answer text,
  error_category text check (error_category in ('concept','calculation','careless','misreading','incomplete','method','recall','application')),
  source text,
  last_ref text,
  repetitions integer not null default 1,
  status text not null default 'open' check (status in ('open','practising','corrected')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  corrected_at timestamptz,
  unique (student_id, question_table, question_id)
);
alter table mistake_book add column if not exists last_ref text;
create index if not exists idx_mistake_book_student on mistake_book (student_id, status);

create table if not exists org_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  scope text not null check (scope in ('weekly','class','subject','batch')),
  title text not null,
  subject_id uuid references subjects(id) on delete set null,
  size integer not null default 8 check (size between 3 and 20),
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  mode text not null check (mode in ('practice','challenge','mixed','boss','weakness','mistake_review','comeback','daily','session_quiz','org')),
  subject_id uuid references subjects(id) on delete set null,
  skill_id uuid references skills(id) on delete set null,
  chapter_id uuid references chapters(id) on delete set null,
  org_challenge_id uuid references org_challenges(id) on delete set null,
  ref text,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  plan jsonb not null default '[]'::jsonb,
  cursor integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  total integer not null default 0,
  correct integer not null default 0,
  accuracy numeric,
  xp_awarded integer not null default 0,
  baseline jsonb,
  result jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_challenge_attempts_student on challenge_attempts (student_id, started_at desc);
create unique index if not exists uq_challenge_daily on challenge_attempts (student_id, ref) where mode = 'daily';

create table if not exists leaderboards (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('class','batch','centre','challenge')),
  name text not null,
  owner_user_id uuid references users(id) on delete cascade,
  grade text,
  org_challenge_id uuid references org_challenges(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists leaderboard_entries (
  leaderboard_id uuid not null references leaderboards(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (leaderboard_id, student_id)
);

-- Built so a future "Challenge a Friend" can be switched on. No screen uses it yet (feature flag friend_challenge is OFF).
create table if not exists friend_challenges (
  id uuid primary key default gen_random_uuid(),
  created_by_student uuid not null references students(id) on delete cascade,
  invite_code text not null unique,
  plan jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','joined','completed','expired','cancelled')),
  joined_by_student uuid references students(id) on delete set null,
  creator_attempt_id uuid references challenge_attempts(id) on delete set null,
  joiner_attempt_id uuid references challenge_attempts(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Patterns worth a person's look. Never shown to the student, never an accusation.
create table if not exists engagement_flags (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_engagement_flags_open on engagement_flags (reviewed, created_at desc);

-- RLS: a student reads only their own rows; nothing is writable from the browser.
do $$
declare t text;
begin
  foreach t in array array['student_engagement','xp_transactions','engagement_events','student_achievements','personal_bests','mistake_book','challenge_attempts','daily_missions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_own_read', t);
    execute format('create policy %I on %I for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()))', t || '_own_read', t);
  end loop;
end $$;

alter table mission_items enable row level security;
drop policy if exists mission_items_own_read on mission_items;
create policy mission_items_own_read on mission_items for select using (
  mission_id in (select m.id from daily_missions m where m.student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid())));

alter table achievements enable row level security;
drop policy if exists achievements_read_all on achievements;
create policy achievements_read_all on achievements for select using (auth.uid() is not null);

alter table leaderboard_entries enable row level security;
drop policy if exists leaderboard_entries_own_read on leaderboard_entries;
create policy leaderboard_entries_own_read on leaderboard_entries for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- Server only (RLS on, no policy): other students' data and internal review.
alter table leaderboards enable row level security;
alter table org_challenges enable row level security;
alter table friend_challenges enable row level security;
alter table engagement_flags enable row level security;

-- Achievements. Each one is a real learning behaviour with a stated rule (metric >= threshold). XP can be edited by the founder in the table.
insert into achievements (code, category, title, description, metric, threshold, xp, sort) values
 ('streak_3','consistency','3-day streak','Studied on 3 days in a row.','longest_streak',3,10,10),
 ('streak_7','consistency','7-day streak','Studied on 7 days in a row.','longest_streak',7,25,11),
 ('streak_14','consistency','14-day streak','Studied on 14 days in a row.','longest_streak',14,50,12),
 ('streak_30','consistency','30-day streak','Studied on 30 days in a row.','longest_streak',30,100,13),
 ('first_diagnostic','learning','First diagnostic','Finished a diagnostic test.','diagnostics_done',1,10,20),
 ('first_lesson','learning','First lesson','Finished a learning session with at least 3 questions answered.','lessons_done',1,10,21),
 ('first_concept_mastered','learning','First concept mastered','One skill reached the Mastered band (90+).','skills_mastered',1,20,22),
 ('first_chapter_mastered','learning','First chapter mastered','Every skill you have tried in a chapter is at Strong or above, and at least 70% of the chapter is covered.','chapters_mastered',1,50,23),
 ('improve_5','improvement','+5 percentage points','Your best score in a subject is 5 points above your first scored attempt (at least 3 scored attempts).','best_improvement',5,15,30),
 ('improve_10','improvement','+10 percentage points','Your best score in a subject is 10 points above your first scored attempt (at least 3 scored attempts).','best_improvement',10,30,31),
 ('improve_20','improvement','+20 percentage points','Your best score in a subject is 20 points above your first scored attempt (at least 3 scored attempts).','best_improvement',20,60,32),
 ('first_quiz','assessment','First quiz','Finished a quiz of at least 5 questions.','quizzes_done',1,10,40),
 ('first_mock','assessment','First mock','Submitted a mock test.','mocks_done',1,20,41),
 ('improved_mock','assessment','Improved mock score','A later mock in a subject scored higher than an earlier one.','mock_improved',1,30,42),
 ('difficult_challenge','assessment','Completed a difficult challenge','Finished a Challenge or Boss Battle with at least 5 questions and 50% correct.','hard_challenges',1,25,43),
 ('mistakes_10','mistakes','Corrected 10 mistakes','Answered 10 earlier mistakes correctly on a retry.','mistakes_corrected',10,25,50),
 ('mistakes_25','mistakes','Corrected 25 mistakes','Answered 25 earlier mistakes correctly on a retry.','mistakes_corrected',25,50,51),
 ('reduced_repeats','mistakes','Reduced repeated mistakes','Corrected 3 mistakes you had made more than once.','repeat_mistakes_corrected',3,30,52),
 ('chapter_checkpoint','cbse','Chapter checkpoint','Finished a chapter-level check or chapter challenge.','chapter_checkpoints',1,15,60),
 ('subject_checkpoint','cbse','Subject checkpoint','Finished a full subject diagnostic.','subject_checkpoints',1,20,61),
 ('revision_milestone','cbse','Revision milestone','Finished 10 mistake-review or comeback rounds.','revision_rounds',10,30,62),
 ('mock_milestone','cbse','Mock milestone','Submitted 3 mock tests.','mocks_done',3,40,63)
on conflict (code) do nothing;

insert into commerce_settings (key, value) values ('engagement', '{
 "features": {"missions": true, "xp": true, "streaks": true, "achievements": true, "personal_best": true, "leaderboard": true, "daily_challenge": true, "boss": true, "friend_challenge": false, "referral": false},
 "mission": {"items": 3, "max_items": 4, "questions_target": 8},
 "xp": {"diagnostic": 30, "learning_session": 10, "learning_session_correct_cap": 10, "practice_correct": 2, "practice_attempt": 1, "mistake_corrected": 5, "quiz_complete": 10, "mock_complete": 40, "revision": 8, "weak_practice_bonus": 5, "personal_best": 15, "mission_complete": 15, "boss_complete": 40, "daily_challenge": 10, "daily_cap": 150, "min_seconds_per_answer": 3, "recent_question_days": 7, "backfill_days": 30},
 "notifications": {"max_per_day": 2},
 "leaderboard": {"min_members": 3, "window_days": 7},
 "experiments": {}
}'::jsonb) on conflict (key) do nothing;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-22', 'v57', 'Student Engagement & Retention Engine: missions, XP, streaks, personal bests, achievements, mistake book, challenges, journey, optional leaderboards, admin engagement dashboard', 'Founder request (engagement master prompt)', '0034 engagement tables', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v57');
