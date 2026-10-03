-- In-app feedback mechanism, so real students/parents trying the deployed app
-- can tell us what's broken or confusing without leaving the page.
--
-- Deliberately NOT tied to the students/users RLS-owner pattern used
-- elsewhere: feedback must work for a visitor who hasn't signed up yet (e.g.
-- a parent evaluating the app before letting their child use it), so inserts
-- are allowed from anyone, logged in or not. student_id is attached when we
-- have a session, purely for context — never required.
--
-- No select policy is defined for anon/authenticated on purpose: nobody but
-- the service role (used only from a future admin view, or read directly
-- against the database) can read submitted feedback back out through the
-- API. This keeps a visitor's feedback from being listable by other
-- visitors, without needing a per-row ownership check.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  contact_email text,
  page text,
  rating smallint check (rating between 1 and 5),
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_created_at on feedback(created_at desc);

alter table feedback enable row level security;

drop policy if exists feedback_insert_anyone on feedback;
create policy feedback_insert_anyone on feedback
  for insert
  to anon, authenticated
  with check (true);
