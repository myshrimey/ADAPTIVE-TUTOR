-- v44: a family's request to delete a student's data. The founder carries it out at /admin/data-requests.
-- The row keeps no child data after completion (label and student link are cleared).
create table if not exists data_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  student_id uuid,
  student_label text,
  kind text not null default 'delete',
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table data_requests drop constraint if exists data_requests_status_check;
alter table data_requests add constraint data_requests_status_check check (status in ('requested','completed','cancelled'));
create index if not exists idx_data_requests_status on data_requests(status, requested_at);
alter table data_requests enable row level security;
drop policy if exists data_requests_select_own on data_requests;
create policy data_requests_select_own on data_requests for select using (auth_user_id = auth.uid());
-- Inserts go through the server (service role) after the server derives the ids; no client insert policy on purpose.
