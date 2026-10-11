-- A richer student/parent profile — school details, family/contact details,
-- and academic performance in classes 6-9 before joining Sahayak. Collected
-- from the student (or their parent) on a new /profile page, voluntarily.
-- Purpose: understanding who is actually using the app and how well they
-- were doing before, for product analytics and for telling Sahayak's story
-- to schools/investors/partners later — never shown to other students, and
-- nothing here feeds the tutoring or mastery logic itself.

create table if not exists student_profile_details (
  student_id uuid primary key references students(id) on delete cascade,
  school_name text,
  school_board text,
  school_city text,
  school_state text,
  parent_name text,
  parent_relation text,
  parent_occupation text,
  parent_email text,
  parent_phone text,
  siblings_count smallint,
  address text,
  how_heard_about_us text,
  updated_at timestamptz not null default now()
);

-- One row per prior class (6-9), so a student can fill in as many or as few
-- as they remember; overall_percentage is a simple 0-100 figure rather than
-- per-subject marks, to keep the form quick to fill in.
create table if not exists student_academic_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_level smallint not null check (class_level in (6, 7, 8, 9)),
  overall_percentage numeric(5, 2) check (overall_percentage is null or (overall_percentage >= 0 and overall_percentage <= 100)),
  board text,
  remarks text,
  updated_at timestamptz not null default now(),
  unique (student_id, class_level)
);
create index if not exists idx_academic_history_student on student_academic_history(student_id);

alter table student_profile_details enable row level security;
alter table student_academic_history enable row level security;

-- Same ownership pattern used throughout the app: a row is "mine" if its
-- student_id traces back to my own auth.uid() through students -> users.
drop policy if exists student_profile_details_owner on student_profile_details;
create policy student_profile_details_owner on student_profile_details
  for all to authenticated
  using (
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

drop policy if exists student_academic_history_owner on student_academic_history;
create policy student_academic_history_owner on student_academic_history
  for all to authenticated
  using (
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
