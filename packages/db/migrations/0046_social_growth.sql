-- v72: Social Media Growth Engine. Additive and re-runnable. Server-only: RLS on, no policies, so the browser can never read or write these.
-- Settings live in commerce_settings under the key 'social_growth' (no new settings table).
create table if not exists social_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  objective text,
  audience text,
  start_date date,
  end_date date,
  budget_inr numeric,
  status text not null default 'active',
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);
create table if not exists social_experiments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references social_campaigns(id) on delete set null,
  name text not null,
  hypothesis text,
  status text not null default 'running',
  winner_content_id uuid,
  winner_note text,
  created_at timestamptz not null default now()
);
create table if not exists social_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  campaign_id uuid references social_campaigns(id) on delete set null,
  experiment_id uuid references social_experiments(id) on delete set null,
  variant text,
  parent_id uuid,
  platform text not null,
  audience text not null,
  objective text not null,
  pillar text,
  content_type text not null,
  scope text not null default 'cbse',
  topic text,
  hook text,
  body text not null default '',
  cta text,
  hashtags text[] not null default '{}',
  image_spec jsonb,
  language text not null default 'en',
  status text not null default 'DRAFT',
  planned_date date,
  source text not null default 'template',
  ai_meta jsonb,
  quality jsonb,
  archived boolean not null default false,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_social_content_status on social_content (status, planned_date);
create index if not exists idx_social_content_campaign on social_content (campaign_id);
create table if not exists social_publications (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references social_content(id) on delete cascade,
  platform text not null,
  publication_status text not null default 'published_manually',
  published_at timestamptz not null default now(),
  external_url text,
  notes text,
  recorded_by text,
  created_at timestamptz not null default now()
);
create table if not exists social_metrics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references social_content(id) on delete cascade,
  platform text not null,
  metric_date date not null default current_date,
  impressions integer, reach integer, likes integer, comments integer, shares integer, saves integer, clicks integer,
  profile_visits integer, followers_gained integer,
  leads integer, registrations integer, conversions integer, revenue_inr numeric,
  entered_by text,
  created_at timestamptz not null default now(),
  unique (content_id, metric_date)
);
create table if not exists social_audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text,
  action text not null,
  actor text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_social_audit_entity on social_audit_log (entity_type, entity_id, created_at desc);
create table if not exists social_pillars (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort integer not null default 0
);
create table if not exists social_hashtags (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  tag text not null,
  active boolean not null default true,
  unique (kind, tag)
);
create table if not exists social_observations (
  id uuid primary key default gen_random_uuid(),
  competitor text not null,
  platform text,
  topic text,
  content_type text,
  observation text,
  url text,
  observed_on date,
  notes text,
  created_at timestamptz not null default now()
);
alter table social_campaigns enable row level security;
alter table social_experiments enable row level security;
alter table social_content enable row level security;
alter table social_publications enable row level security;
alter table social_metrics enable row level security;
alter table social_audit_log enable row level security;
alter table social_pillars enable row level security;
alter table social_hashtags enable row level security;
alter table social_observations enable row level security;
-- Default pillars (only inserted when missing)
insert into social_pillars (name, sort)
select v.name, v.sort from (values
 ('Learning Gaps',1),('Adaptive Learning',2),('Exam Preparation',3),('CBSE',4),('Parent Education',5),('Student Motivation',6),('Tutor Support',7),
 ('Coaching Centre Growth',8),('Teacher Support',9),('AI in Education',10),('Learning Science',11),('Sahayak Product',12),('Student Engagement',13),
 ('Founder Journey',14),('Social Proof',15),('Frequently Asked Questions',16),('Exam Countdown',17),('Study Skills',18),('Multilingual Education',19),('Education Accessibility',20)
) as v(name, sort) where not exists (select 1 from social_pillars p where p.name = v.name);
insert into social_hashtags (kind, tag)
select v.kind, v.tag from (values
 ('broad','#Education'),('broad','#Learning'),('broad','#StudyTips'),('broad','#EdTech'),
 ('niche','#AdaptiveLearning'),('niche','#LearningGaps'),('niche','#PersonalisedLearning'),('niche','#BaselineAssessment'),
 ('audience','#CBSEParents'),('audience','#CBSEStudents'),('audience','#Tutors'),('audience','#CoachingCentres'),
 ('location','#India'),('location','#IndianEducation'),
 ('exam','#CBSEClass10'),('exam','#BoardExams'),('exam','#CBSE2027'),('exam','#ExamPreparation'),
 ('product','#Sahayak')
) as v(kind, tag) where not exists (select 1 from social_hashtags h where h.kind = v.kind and h.tag = v.tag);
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-27', 'v72', 'Social Media Growth Engine (manual publishing, no platform API connected)', 'Founder request (Social Media Growth Engine prompt)', '0046 social_campaigns, social_experiments, social_content, social_publications, social_metrics, social_audit_log, social_pillars, social_hashtags, social_observations (server-only)', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v72');
notify pgrst, 'reload schema';
