-- v68: spaced revision. One row per student per competency: when it is next due for a short review.
-- Worked out from the answers the student already gave (student_competency_evidence); no AI is used.
create table if not exists review_schedule (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  competency_id uuid not null references competencies(id) on delete cascade,
  rung smallint not null default 0,
  interval_days int not null default 1,
  reps int not null default 0,
  lapses int not null default 0,
  due_on date not null,
  last_day date not null,
  last_result text not null default 'first' check (last_result in ('first','pass','fail','early')),
  last_evidence_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (student_id, competency_id)
);
create index if not exists idx_review_due on review_schedule (student_id, due_on);
alter table review_schedule enable row level security;
drop policy if exists review_schedule_own_read on review_schedule;
create policy review_schedule_own_read on review_schedule for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-26', 'v68', 'Spaced revision scheduler and Revise-today page', 'Founder request (continue building; master prompt section 10)', '0044 review_schedule (own-read; writes server only)', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v68');
notify pgrst, 'reload schema';
