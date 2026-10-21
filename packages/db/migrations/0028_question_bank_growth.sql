-- v53: automatic question-bank growth. One row per subject: how many new questions are still owed, a short lock so two
-- requests do not generate at once, and running totals. Server-only (no policies; the service key bypasses RLS).
create table if not exists question_bank_growth (
  subject_id uuid primary key references subjects(id) on delete cascade,
  pending int not null default 0 check (pending >= 0),
  produced_total int not null default 0,
  rejected_total int not null default 0,
  locked_until timestamptz,
  last_run_at timestamptz,
  last_run_made int not null default 0,
  updated_at timestamptz not null default now()
);
alter table question_bank_growth enable row level security;
