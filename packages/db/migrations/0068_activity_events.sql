-- v138: one central, server-only activity log (Decision FD-16: lawyer review D7 deferred by the founder; NOT a compliance claim).
-- Minimal by design: event name, time, result, short safe labels. Never message text, answers, device details or contact details.
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references users(id) on delete cascade,
  actor_role text,
  category text not null check (category in ('account','learning','assessment','engagement','technical','payment','admin')),
  event_type text not null,
  entity text,
  entity_id text,
  status text not null default 'ok' check (status in ('ok','failed','denied')),
  meta jsonb not null default '{}'::jsonb,
  correlation_id text
);
create index if not exists idx_activity_user_time on activity_events (user_id, occurred_at desc);
create index if not exists idx_activity_type_time on activity_events (event_type, occurred_at desc);
create index if not exists idx_activity_time on activity_events (occurred_at);
-- Row rules on, no policies: only the server key can read or write.
alter table activity_events enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-22', 'v138', 'A central activity log (sign-in, sign-out, failed sign-in, profile saved, payment request, report viewed) and a per-account timeline page for the founder', 'Account activity could not be seen in one place; the founder chose to proceed while the legal review is deferred', '0068 activity_events (new server-only table; deleting an account deletes its events)', 'none', 'Deploy the v138 website, then run 0068. Timeline: /admin/accounts, open an account, then Timeline.'
where not exists (select 1 from system_changelog where version = 'v138' and change like 'A central activity log%');
