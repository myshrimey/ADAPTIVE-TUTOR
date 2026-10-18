-- v50: separate portals for parents, tutors and coaching centres (teachers already exist).
-- Re-runnable. Adults NEVER get row-level read access to a student's tables: a student's data is read
-- only by server code that first checks an ACTIVE row in student_links (created when the family
-- hands over a one-time code). Students can see and cancel who is linked to them.

-- 1. New roles
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('student','parent','admin','teacher','tutor','centre'));

-- 2. Profile for parent / tutor / coaching-centre accounts
create table if not exists adult_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  role text not null check (role in ('parent','tutor','centre')),
  display_name text not null,        -- a parent's or tutor's name, or the centre's name
  contact_name text,                 -- centre: person to contact
  city text,
  qualification text,                -- tutor
  subjects text,                     -- tutor / centre, free text
  status text not null default 'active' check (status in ('pending','active','suspended')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table adult_profiles enable row level security;
drop policy if exists adult_profiles_owner_read on adult_profiles;
create policy adult_profiles_owner_read on adult_profiles
  for select using (user_id in (select u.id from users u where u.auth_user_id = auth.uid()));

-- 3. One-time codes a student/family creates to let an adult in
create table if not exists link_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  for_role text not null check (for_role in ('parent','tutor','centre')),
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_link_codes_student on link_codes(student_id);
create unique index if not exists idx_link_codes_hash on link_codes(code_hash);
alter table link_codes enable row level security;
drop policy if exists link_codes_owner_read on link_codes;
create policy link_codes_owner_read on link_codes
  for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- 4. Who is linked to which student
create table if not exists student_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  adult_user_id uuid not null references users(id) on delete cascade,
  link_type text not null check (link_type in ('parent','tutor','centre')),
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text check (revoked_by in ('student','adult','admin')),
  unique (student_id, adult_user_id)
);
create index if not exists idx_student_links_adult on student_links(adult_user_id) where status = 'active';
alter table student_links enable row level security;
drop policy if exists student_links_student_read on student_links;
create policy student_links_student_read on student_links
  for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));
drop policy if exists student_links_adult_read on student_links;
create policy student_links_adult_read on student_links
  for select using (adult_user_id in (select u.id from users u where u.auth_user_id = auth.uid()));

-- 5. Attempts to use a code (to slow down guessing)
create table if not exists link_attempts (
  id uuid primary key default gen_random_uuid(),
  adult_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_link_attempts_user on link_attempts(adult_user_id, created_at);
alter table link_attempts enable row level security;
-- No policies on link_attempts, link_codes writes, student_links writes: server (service key) only.
