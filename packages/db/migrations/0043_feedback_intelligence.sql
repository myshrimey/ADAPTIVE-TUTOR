-- v67: Feedback Intelligence. Sorts messages into groups, estimates severity and risk, and keeps a human decision trail.
-- Nothing here changes any lesson, score or price by itself: a decision is only a record that a person made.
alter table feedback add column if not exists category text;
alter table feedback add column if not exists feature_area text;
alter table feedback add column if not exists severity text;
alter table feedback add column if not exists cluster_id uuid;
alter table feedback add column if not exists duplicate_of uuid;
alter table feedback add column if not exists analysed_at timestamptz;
create index if not exists idx_feedback_cluster on feedback(cluster_id);
create index if not exists idx_feedback_unanalysed on feedback(analysed_at) where analysed_at is null;

create table if not exists feedback_clusters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  feature_area text not null,
  keywords text[] not null default '{}',
  severity text not null default 'low' check (severity in ('low','medium','high')),
  risk text not null default 'low' check (risk in ('low','medium','high')),
  status text not null default 'analysed' check (status in ('new','analysed','proposed','under_review','approved','rejected','modified','deferred','implemented','verified','rolled_back')),
  report_count int not null default 0,
  duplicate_count int not null default 0,
  affected_pages text[] not null default '{}',
  likely_cause text,
  proposed_action text,
  reviewer_note text,
  decided_by text,
  decided_at timestamptz,
  tested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fb_clusters_status on feedback_clusters(status, severity);

create table if not exists feedback_cluster_events (
  id bigint generated always as identity primary key,
  cluster_id uuid not null references feedback_clusters(id) on delete cascade,
  at timestamptz not null default now(),
  actor text,
  from_status text,
  to_status text not null,
  note text
);
create index if not exists idx_fb_events_cluster on feedback_cluster_events(cluster_id, at desc);

-- Server-only, like page_views: RLS on and no policy, so only the service role can read or write.
alter table feedback_clusters enable row level security;
alter table feedback_cluster_events enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-26', 'v67', 'Grouped admin menu; Feedback Intelligence (groups, severity, human review); status page of the big prompt', 'Founder request', '0043 feedback columns, feedback_clusters, feedback_cluster_events (server-only)', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v67');
notify pgrst, 'reload schema';
