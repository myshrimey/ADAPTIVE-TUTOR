-- 0058 (v96): sign-in brute-force protection. Re-runnable.
-- Holds ONLY failed sign-in attempts, as one-way hashes (no username, no email, no address, no password).
-- Server-only: row level security is on and there is deliberately NO policy, so the browser can never read or write it.
-- The app removes rows older than 24 hours itself; a successful sign-in clears that account's rows.

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_key on public.login_attempts (key_hash, created_at);
create index if not exists idx_login_attempts_ip on public.login_attempts (ip_hash, created_at);
alter table public.login_attempts enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-01', 'v96', 'Sign-in brute-force protection', 'Security: no limit on wrong passwords existed', '0058 login_attempts (hashes of failed attempts only, server-only)', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v96' and change like 'Sign-in brute-force%');
