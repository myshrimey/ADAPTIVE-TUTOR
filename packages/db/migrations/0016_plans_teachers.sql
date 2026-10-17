-- v36: paid plans (access + subject limit), invitation-only students, teachers
-- and content reviews. Re-runnable: guarded backfill, drop-then-create policies.
--
-- Writes to student_access, teacher_profiles and content_reviews happen ONLY
-- through server routes using the service client (admin- or teacher-gated), so
-- none of these tables has an insert/update/delete policy for ordinary users.

-- 1. Teacher role -------------------------------------------------------------
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('student','parent','admin','teacher'));

-- 2. Students created by the founder must complete their profile on first login.
alter table students add column if not exists must_complete_profile boolean not null default false;

-- 3. Plans: what a student may use, and until when ------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'student_access') then
    create table student_access (
      student_id uuid primary key references students(id) on delete cascade,
      plan_code text not null,
      subject_limit smallint not null check (subject_limit between 1 and 10),
      access_until date,            -- null = no end date
      notes text,
      granted_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    -- One-time backfill: every student that exists today keeps access (no end date)
    -- until the founder gives them a plan. Runs only when the table is first created.
    insert into student_access (student_id, plan_code, subject_limit, notes)
      select id, 'grandfathered', 6, 'Existing student before plans were introduced'
      from students;
  end if;
end $$;

alter table student_access drop constraint if exists student_access_plan_code_check;
alter table student_access add constraint student_access_plan_code_check
  check (plan_code in ('free','per_subject_monthly','five_monthly','five_till_march','founding_family','grandfathered','custom'));

alter table student_access enable row level security;
drop policy if exists student_access_owner_read on student_access;
create policy student_access_owner_read on student_access
  for select using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

-- 4. Teachers ------------------------------------------------------------------
create table if not exists teacher_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null,
  qualification text,
  school text,
  subjects text,                  -- free text, e.g. "Maths, Science"
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table teacher_profiles enable row level security;
drop policy if exists teacher_profiles_owner_read on teacher_profiles;
create policy teacher_profiles_owner_read on teacher_profiles
  for select using (
    user_id in (select u.id from users u where u.auth_user_id = auth.uid())
  );

-- 5. Teacher feedback on AI/bank questions ---------------------------------------
-- A teacher's review is FEEDBACK. It never changes what students see by itself;
-- the founder applies it from /admin/reviews (which updates content_status).
create table if not exists content_reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id) on delete cascade,
  item_table text not null check (item_table in ('questions','diagnostic_questions')),
  item_id uuid not null,
  verdict text not null check (verdict in ('approve','needs_fix','reject')),
  comment text,
  suggested_answer text,
  suggested_explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_user_id, item_table, item_id)
);
create index if not exists idx_content_reviews_item on content_reviews(item_table, item_id);
create index if not exists idx_content_reviews_teacher on content_reviews(teacher_user_id, created_at desc);

alter table content_reviews enable row level security;
drop policy if exists content_reviews_owner_read on content_reviews;
create policy content_reviews_owner_read on content_reviews
  for select using (
    teacher_user_id in (select u.id from users u where u.auth_user_id = auth.uid())
  );
