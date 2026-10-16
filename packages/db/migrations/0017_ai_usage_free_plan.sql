-- v37: AI usage / cost log, and the 'free' plan code. Re-runnable.
--
-- ai_usage stores one row per AI call attempt: which provider, what it was for, token
-- counts and timing. It deliberately stores NO prompt or answer text. Only the server
-- (service key) writes and reads it; there is no policy for ordinary users, so with RLS on
-- they can see nothing.

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  student_id uuid references students(id) on delete set null,
  tier text not null check (tier in ('free','paid')),
  provider text not null,
  feature text not null,
  ok boolean not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  error text
);
create index if not exists idx_ai_usage_created on ai_usage(created_at desc);
create index if not exists idx_ai_usage_student_day on ai_usage(student_id, feature, created_at desc);
alter table ai_usage enable row level security;

-- The free plan: one subject, free-tier AI only, small daily limit of AI tutor replies.
alter table student_access drop constraint if exists student_access_plan_code_check;
alter table student_access add constraint student_access_plan_code_check
  check (plan_code in ('free','per_subject_monthly','five_monthly','five_till_march','grandfathered','custom'));
