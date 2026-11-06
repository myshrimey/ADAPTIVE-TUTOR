-- 0060 (v103): request limit for the free public readiness check (/check). Re-runnable.
-- Holds ONLY a one-way hash of the internet address and a time. No name, no email, no answers.
-- Server-only: row level security is on and there is deliberately NO policy. The app removes rows older than 1 hour itself.

create table if not exists public.public_check_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_public_check_log_ip on public.public_check_log (ip_hash, created_at);
alter table public.public_check_log enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-03', 'v103', 'Request limit on the free readiness check', 'Security: the public check had no limit, so one script could copy the question bank or run up database use', '0060 public_check_log (hash of address + time only, server-only)', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v103' and change like 'Request limit on the free%');
