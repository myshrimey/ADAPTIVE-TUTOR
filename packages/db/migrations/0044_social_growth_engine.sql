-- v68: Sahayak Social Media Growth Engine.
-- All content is draft-first. Social credentials are never stored in these tables.
create table if not exists social_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text not null default 'awareness',
  audience text not null default 'parents',
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_social_campaigns_status on social_campaigns(status, start_date);

create table if not exists social_content_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references social_campaigns(id) on delete set null,
  scheduled_for timestamptz,
  platform text not null check (platform in ('facebook','instagram','linkedin')),
  content_type text not null default 'post' check (content_type in ('post','carousel','reel_script','story','video_script')),
  pillar text not null default 'product_demo',
  audience text not null default 'parents',
  objective text not null default 'awareness',
  topic text not null,
  hook text,
  body text not null,
  cta text,
  hashtags text[] not null default '{}',
  image_prompt text,
  image_url text,
  destination_url text,
  utm_source text,
  utm_campaign text,
  status text not null default 'draft' check (status in ('draft','review','approved','scheduled','published','failed','rejected')),
  publisher text not null default 'manual' check (publisher in ('manual','webhook','native_meta','native_linkedin')),
  published_at timestamptz,
  publish_error text,
  impressions bigint,
  engagements bigint,
  clicks bigint,
  leads bigint,
  signups bigint,
  customers bigint,
  revenue_inr numeric(12,2),
  ai_cost_inr numeric(12,4),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_social_content_calendar on social_content_items(scheduled_for, platform, status);
create index if not exists idx_social_content_campaign on social_content_items(campaign_id);
create index if not exists idx_social_content_status on social_content_items(status, platform);

create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook','instagram','linkedin')),
  account_name text not null,
  publisher text not null default 'manual' check (publisher in ('manual','webhook','native_meta','native_linkedin')),
  status text not null default 'not_connected' check (status in ('not_connected','connected','needs_reauth','disabled')),
  external_account_id text,
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, account_name)
);

-- Admin/server-only data: enable RLS without adding public policies.
alter table social_campaigns enable row level security;
alter table social_content_items enable row level security;
alter table social_accounts enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-26', 'v68', 'Social Media Growth Engine: campaigns, platform-specific drafts, review queue and attribution fields', 'Founder request', '0044 social_campaigns, social_content_items, social_accounts', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v68');

notify pgrst, 'reload schema';