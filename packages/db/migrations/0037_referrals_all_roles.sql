-- v60: referral links for every role (student, parent, teacher, tutor, centre) and automatic bonus access days.
-- Re-runnable. Rewards: set by the founder in commerce_settings key 'referral' (rewards_on is OFF until the founder switches it on).

-- One invite code per account (any role).
create table if not exists user_referral_codes (
  user_id uuid primary key references users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- One row per invited account. A person can be invited once (referred_user is unique).
create table if not exists referral_events (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  referrer_user uuid not null references users(id) on delete cascade,
  referred_user uuid not null unique references users(id) on delete cascade,
  referred_role text not null,
  ip_hash text,
  status text not null default 'signed_up' check (status in ('signed_up','qualified','rewarded','held','blocked')),
  note text,
  created_at timestamptz not null default now(),
  qualified_at timestamptz
);
create index if not exists idx_referral_events_referrer on referral_events (referrer_user);
create index if not exists idx_referral_events_status on referral_events (status);

-- Bonus access days. One row per grant; ref is unique so a grant can never be made twice.
-- applied_at is set when the days were added to student_access.access_until; until then they are a held balance.
create table if not exists bonus_days_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  days integer not null check (days > 0 and days <= 365),
  reason text not null,
  ref text not null unique,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_bonus_days_student on bonus_days_ledger (student_id);

alter table user_referral_codes enable row level security;
drop policy if exists user_referral_codes_own_read on user_referral_codes;
create policy user_referral_codes_own_read on user_referral_codes for select using (user_id in (select u.id from users u where u.auth_user_id = auth.uid()));
alter table referral_events enable row level security;   -- server only
alter table bonus_days_ledger enable row level security; -- server only
drop policy if exists bonus_days_own_read on bonus_days_ledger;
create policy bonus_days_own_read on bonus_days_ledger for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

-- Default settings (rewards OFF until the founder decides the number of days and switches them on).
insert into commerce_settings (key, value)
select 'referral', '{"links_on": true, "rewards_on": false, "days_referrer": 7, "days_referred": 7, "max_rewarded_per_referrer": 10, "max_per_ip": 3, "min_answers": 10}'::jsonb
where not exists (select 1 from commerce_settings where key = 'referral');

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-23', 'v60', 'Fixed 20-question diagnostic, answer checking and keypad, fill-to-1000 tool, referral links for all roles with bonus days', 'Founder request 2026-10-23', 'Migration 0037: user_referral_codes, referral_events, bonus_days_ledger, setting referral', 'None (reward days are set by the founder)', 'Run npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v60');
