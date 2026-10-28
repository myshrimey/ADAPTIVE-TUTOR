-- v73: Feedback Intelligence extras (additive; re-runnable). Adds context to each message and review fields to each group.
alter table feedback add column if not exists kind text;
alter table feedback add column if not exists impact text;
alter table feedback add column if not exists role text;
alter table feedback add column if not exists source text not null default 'in_app';
alter table feedback add column if not exists person text;
alter table feedback add column if not exists received_on date;
alter table feedback add column if not exists context jsonb;
alter table feedback add column if not exists positive boolean not null default false;
create index if not exists idx_feedback_source on feedback(source);
create index if not exists idx_feedback_role on feedback(role);
create index if not exists idx_feedback_created on feedback(created_at desc);
alter table feedback_clusters add column if not exists moat text not null default 'none';
alter table feedback_clusters add column if not exists priority_override text;
alter table feedback_clusters add column if not exists priority_reason text;
alter table feedback_clusters add column if not exists ai_analysis jsonb;
alter table feedback_clusters add column if not exists task jsonb;
alter table feedback_clusters add column if not exists deployment_version text;
alter table feedback_clusters add column if not exists validation_status text;
alter table feedback_clusters add column if not exists validation_note text;
alter table feedback_clusters add column if not exists validated_by text;
alter table feedback_clusters add column if not exists validated_at timestamptz;
alter table feedback_clusters add column if not exists defer_until date;
create index if not exists idx_fb_clusters_area on feedback_clusters(feature_area);
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-28', 'v73', 'Feedback Intelligence extras: context, outside-app entry, priority formula, AI analysis (optional), task, validation, analytics', 'Founder request (Feedback Intelligence and Human Review Engine prompt)', '0047 columns on feedback and feedback_clusters', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v73');
notify pgrst, 'reload schema';
