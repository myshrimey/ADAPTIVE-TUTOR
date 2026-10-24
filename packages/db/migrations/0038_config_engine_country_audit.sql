-- v61: exam sessions, curriculum version register, country pricing, audit log, student country/timezone/currency. Re-runnable, no destructive change.

alter table users add column if not exists country text;
alter table users add column if not exists timezone text;
alter table users add column if not exists currency text;

-- Exam sessions: dates and rules are typed by the founder; none are invented here.
create table if not exists exam_sessions (
  id uuid primary key default gen_random_uuid(),
  board text not null default 'CBSE',
  academic_year text not null,
  class_level text not null,
  exam_type text not null default 'board',
  session_label text not null,
  start_date date,
  end_date date,
  subjects text[] not null default '{}',
  rules jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_exam_sessions_lookup on exam_sessions (board, academic_year, class_level);

-- Curriculum version register: which syllabus version exists for a board/year/class/subject/language, where it came from and who approved it.
create table if not exists curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  board text not null default 'CBSE',
  academic_year text not null,
  class_level text not null,
  subject_id uuid references subjects(id) on delete set null,
  subject_label text,
  language text not null default 'en',
  version integer not null default 1,
  source_reference text,
  status text not null default 'draft' check (status in ('draft','needs_review','approved','published','retired')),
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_curriculum_versions_lookup on curriculum_versions (board, academic_year, class_level);

-- Country-wise prices (testing ranges are typed by the founder; nothing is converted automatically).
create table if not exists country_prices (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  currency text not null,
  product_code text not null,
  price numeric(12,2) not null check (price >= 0),
  tax_pct numeric(5,2) not null default 0 check (tax_pct >= 0 and tax_pct <= 60),
  payment_method text,
  tier text,
  promotion text,
  active boolean not null default false,
  note text,
  updated_at timestamptz not null default now(),
  unique (country, product_code)
);

-- Audit log: who changed what in the admin area. No passwords, keys or answer text are ever written here.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb
);
create index if not exists idx_audit_logs_at on audit_logs (at desc);

alter table exam_sessions enable row level security;
alter table curriculum_versions enable row level security;
alter table country_prices enable row level security;
alter table audit_logs enable row level security;
-- All four are server-written and admin-read only (no policies).

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-24', 'v61', 'Founder financial simulator, exam sessions, curriculum version register, country pricing, audit log', 'Founder master upgrade prompt 2026-10-24', 'Migration 0038: users.country/timezone/currency, exam_sessions, curriculum_versions, country_prices, audit_logs', 'None (country prices are typed by the founder and not used at checkout)', 'Run npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v61');
