-- v69: tutor / centre batches and intervention tracking. Server-only tables (RLS on, no policies): adults never read student data directly;
-- server code first checks an ACTIVE row in student_links (see 0025) before showing or saving anything about a student.
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null,
  subject_id uuid references subjects(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_batches_owner on batches(owner_user_id) where archived = false;

create table if not exists batch_students (
  batch_id uuid not null references batches(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (batch_id, student_id)
);

create table if not exists interventions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid references skills(id) on delete set null,
  problem text not null,
  evidence text,
  action text not null,
  status text not null default 'planned' check (status in ('planned','done','dropped')),
  baseline_score numeric,
  followup_score numeric,
  result text check (result in ('improved','no_change','lower','not_enough_data')),
  created_at timestamptz not null default now(),
  done_at timestamptz,
  measured_at timestamptz
);
create index if not exists idx_interventions_owner on interventions(owner_user_id, created_at desc);
create index if not exists idx_interventions_student on interventions(student_id);

alter table batches enable row level security;
alter table batch_students enable row level security;
alter table interventions enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-27', 'v69', 'Tutor and centre: who needs attention, batches, intervention tracking', 'Founder request (continue; master prompt sections 21-24)', '0045 batches, batch_students, interventions (server-only)', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v69');
notify pgrst, 'reload schema';
