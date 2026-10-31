-- v85: "how sure are you?" records for metacognition. Additive, re-runnable. Server-only (RLS on, no policies).
-- Used only to show the student how well their sureness matches their answers. Never changes mastery, marks or revision dates.
create table if not exists calibration_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  source text not null default 'review' check (source in ('review','mixed','baseline','quiz')),
  confidence smallint not null check (confidence between 1 and 3),
  correct boolean not null,
  competency_id uuid,
  item_table text,
  item_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_calibration_student on calibration_events (student_id, created_at desc);
alter table calibration_events enable row level security;
notify pgrst, 'reload schema';
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-30', 'v85', 'Metacognition: "how sure are you?" before checking an answer, calibration summary', 'Founder master prompt (metacognition and calibration)', '0053 calibration_events', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v85');
