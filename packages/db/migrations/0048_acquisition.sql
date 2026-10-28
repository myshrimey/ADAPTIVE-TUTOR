-- v76: Acquisition & Referral Intelligence Engine. Additive and re-runnable. Server-only tables (RLS on, no policies): the browser never reads them.
-- Reuses: users.source/utm (first touch, v58), page_views (traffic), referral_events + referrals, pilot_payments, revenue_entries, student_access,
-- social_campaigns/social_content (v72), crm_records, expenses, student_links. Nothing here pays, credits or rewards anyone.

-- 1. A tracked-link arrival. `anon` is a salted hash of the device cookie (not the cookie itself, no IP, no user agent, no name).
--    When the person signs up, user_id is filled in: that is the only place a website arrival is directly matched to an account.
create table if not exists acquisition_touches (
  id uuid primary key default gen_random_uuid(),
  anon text not null,
  touch_day date not null default current_date,
  at timestamptz not null default now(),
  source text not null,
  medium text,
  campaign text,
  content text,
  term text,
  landing text,
  partner_code text,
  referral_code text,
  user_id uuid references users(id) on delete set null
);
create unique index if not exists uq_acq_touch_day on acquisition_touches (anon, touch_day, source, coalesce(campaign, ''), coalesce(content, ''), coalesce(partner_code, ''));
create index if not exists idx_acq_touches_at on acquisition_touches (at desc);
create index if not exists idx_acq_touches_anon on acquisition_touches (anon) where user_id is null;
create index if not exists idx_acq_touches_user on acquisition_touches (user_id) where user_id is not null;
alter table acquisition_touches enable row level security;

-- 2. One row per account: first touch, last touch, referral, partner. Never overwritten by a later visit (first); last is refreshed by a later tracked link only until signup.
create table if not exists acquisition_attribution (
  user_id uuid primary key references users(id) on delete cascade,
  customer_type text not null default 'student',
  first_source text, first_medium text, first_campaign text, first_content text, first_term text, first_landing text, first_at timestamptz,
  last_source text, last_medium text, last_campaign text, last_content text, last_term text, last_landing text, last_at timestamptz,
  referral_code text,
  referrer_user uuid references users(id) on delete set null,
  partner_code text,
  social_content_id uuid,
  campaign_id uuid,
  matched_touch boolean not null default false,
  backfilled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_acq_attr_first_source on acquisition_attribution (first_source);
create index if not exists idx_acq_attr_partner on acquisition_attribution (partner_code) where partner_code is not null;
alter table acquisition_attribution enable row level security;

-- 3. Partners: a tutor, coaching centre, school, institution or other partner with an identifier such as TUTOR-ARUN-001.
--    reward_status is MANUAL: nothing promises or pays a commission.
create table if not exists acq_partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('tutor','centre','school','govt_school','other')),
  name text not null,
  user_id uuid references users(id) on delete set null,
  crm_id uuid references crm_records(id) on delete set null,
  status text not null default 'active' check (status in ('lead','meeting','pilot','active','paused','closed')),
  reward_status text not null default 'none' check (reward_status in ('none','under_review','approved','declined','paid_by_hand')),
  reward_note text,
  notes text,
  created_at timestamptz not null default now()
);
alter table acq_partners enable row level security;

-- 4. An offline / manually recorded sale and where it came from. Points at the SAME payment tables the rest of the app uses.
create table if not exists acq_sale_links (
  id uuid primary key default gen_random_uuid(),
  pilot_payment_id uuid unique references pilot_payments(id) on delete cascade,
  revenue_entry_id uuid unique references revenue_entries(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  payment_source text,
  campaign text,
  partner_code text,
  referral_code text,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  check (pilot_payment_id is not null or revenue_entry_id is not null)
);
alter table acq_sale_links enable row level security;

-- 5. Acquisition experiments (founder-defined; never judged from tiny samples).
create table if not exists acq_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text,
  channel text,
  audience text,
  variant_a text,
  variant_b text,
  start_date date,
  end_date date,
  metric text not null default 'signup_rate',
  status text not null default 'running' check (status in ('planned','running','finished','stopped')),
  note text,
  created_at timestamptz not null default now()
);
alter table acq_experiments enable row level security;

-- 6. Small additions to existing tables.
alter table page_views add column if not exists content text;
alter table expenses add column if not exists acq_campaign text;   -- tag an expense to a campaign slug so CAC can use it
alter table expenses add column if not exists acq_source text;     -- or to a source (facebook, google ...)
alter table social_campaigns add column if not exists owner text;
alter table social_campaigns add column if not exists platforms text;

notify pgrst, 'reload schema';

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-28', 'v76', 'Acquisition & Referral Intelligence Engine (/admin/acquisition)', 'Founder request', '0048 acquisition_touches, acquisition_attribution, acq_partners, acq_sale_links, acq_experiments; page_views.content; expenses.acq_campaign/acq_source; social_campaigns.owner/platforms', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v76');
