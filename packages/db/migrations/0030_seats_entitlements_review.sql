-- v54b: Tutor/Centre seats and shared credit pool, entitlement settings, board dates, review statuses, feature usage counters.
-- Re-runnable.

-- 1. A tutor / centre plan, activated by the founder after a payment he has checked.
create table if not exists org_plans (
  user_id uuid primary key references users(id) on delete cascade,
  product_code text not null,
  student_limit integer not null check (student_limit >= 0),
  credits_per_month integer not null default 0,
  access_until date,
  status text not null default 'active' check (status in ('active','suspended','expired')),
  activated_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table org_plans enable row level security;
drop policy if exists org_plans_owner_read on org_plans;
create policy org_plans_owner_read on org_plans for select
  using (user_id in (select u.id from users u where u.auth_user_id = auth.uid()));

-- 2. The tutor's / centre's shared pool of handwritten-mock credits. One row per event; (user, ref) is unique so nothing is counted twice.
create table if not exists org_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  delta integer not null,
  reason text,
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);
alter table org_credit_ledger enable row level security;
drop policy if exists org_credit_ledger_owner_read on org_credit_ledger;
create policy org_credit_ledger_owner_read on org_credit_ledger for select
  using (user_id in (select u.id from users u where u.auth_user_id = auth.uid()));

-- 3. Who paid (a parent can pay for a linked child).
alter table pilot_payments add column if not exists paid_by_user_id uuid;

-- 4. Review statuses for handwritten evaluation.
alter table handwritten_evaluations add column if not exists review_status text;
alter table handwritten_evaluations drop constraint if exists handwritten_evaluations_review_status_check;
alter table handwritten_evaluations add constraint handwritten_evaluations_review_status_check
  check (review_status is null or review_status in ('AI_EVALUATED','HUMAN_REVIEW_REQUIRED','HUMAN_REVIEWED','FAILED','REPROCESSING'));
update handwritten_evaluations set review_status = case status
  when 'ai_marked' then 'AI_EVALUATED' when 'teacher_done' then 'HUMAN_REVIEWED' else 'HUMAN_REVIEW_REQUIRED' end
  where review_status is null;
alter table mock_exams add column if not exists review_status text;
alter table mock_exams drop constraint if exists mock_exams_review_status_check;
alter table mock_exams add constraint mock_exams_review_status_check
  check (review_status is null or review_status in ('AI_EVALUATED','HUMAN_REVIEW_REQUIRED','HUMAN_REVIEWED','FAILED','REPROCESSING'));
alter table mock_exams add column if not exists eval_stages jsonb;

-- 5. Daily use of limited free features (voice read-aloud etc.). Server only.
create table if not exists feature_usage (
  student_id uuid not null references students(id) on delete cascade,
  feature text not null,
  day date not null,
  used integer not null default 0,
  primary key (student_id, feature, day)
);
alter table feature_usage enable row level security;

-- 6. Settings (the founder edits these in /admin/pricing; nothing here is a price)
insert into commerce_settings (key, value, note) values
 ('entitlements', '{"enforce":true,"paid_features":["advanced_diagnostic","advanced_assessment","advanced_parent_report","board_readiness","board_preparation_programme","exam_rescue","advanced_analytics"]}', 'Which features need a paid plan. Set enforce to false to open them to everyone.'),
 ('seats', '{"enforce":false,"credits_per_grant":1}', 'Tutor/centre seat limits. enforce=false keeps today''s behaviour (no limit).'),
 ('boards', '{"board1_label":"Board Exam 1","board1_date":null,"board2_label":"Board Exam 2","board2_date":null}', 'Exam dates. Left empty on purpose until the founder enters them.')
on conflict (key) do nothing;
