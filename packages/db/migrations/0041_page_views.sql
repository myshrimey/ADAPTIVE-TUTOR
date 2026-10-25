-- v64: first-party website traffic analytics. No cookies, no IP address, no names: `visitor` is a daily-rotating hash.
-- Server-only: RLS on with no policies, so the browser can never read or write it.
create table if not exists page_views (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  visitor text not null,
  path text not null,
  channel text not null default 'Direct',
  source text,
  campaign text,
  device text not null default 'desktop',
  browser text,
  os text,
  country text,
  region text,
  signed_in boolean not null default false
);
create index if not exists idx_page_views_at on page_views (at desc);
create index if not exists idx_page_views_path on page_views (path, at desc);
alter table page_views enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-25', 'v64', 'Website traffic analytics (admin), Plans & Pricing menu on every page, new logo, free-plan notice on the subject picker', 'Founder request', '0041 page_views (server-only, no cookies, no IP stored)', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v64');
