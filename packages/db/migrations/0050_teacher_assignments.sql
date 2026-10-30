-- v80: a teacher is assigned to a student by the founder/academic team. This is a RECORD of the relationship only.
-- It gives the teacher NO access to the student's learning data (a student's data is still shared only by the student's own code, v50).
create table if not exists teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_user uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ended')),
  note text,
  assigned_by text,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (teacher_user, student_id)
);
create index if not exists idx_teacher_assign_teacher on teacher_assignments (teacher_user) where status = 'active';
create index if not exists idx_teacher_assign_student on teacher_assignments (student_id) where status = 'active';
alter table teacher_assignments enable row level security;
notify pgrst, 'reload schema';
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-29', 'v80', 'Teacher-to-student assignment records (/admin/assignments)', 'Founder request (v79 follow-up)', '0050 teacher_assignments', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v80');
