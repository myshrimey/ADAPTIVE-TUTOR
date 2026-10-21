-- v55: Founder Command Centre (admin-only): CRM for leads/customers/schools, funding & investor CRM, expenses, tasks, change log, project memory.
-- Re-runnable. ALL tables are server-only (RLS on, no policies): only the admin pages (service key, behind ADMIN_EMAILS) read or write them.
-- Nothing here stores child-level learning data. Contacts are ADULTS (parents, tutors, schools, investors).

-- 1. Where a user came from (first touch). Set at sign-up from a cookie; never shown to the user.
alter table users add column if not exists source text;
alter table users add column if not exists utm jsonb;

-- 2. One CRM table for every customer-type lead: parent, student family, tutor, centre, school, government institution, partner.
create table if not exists crm_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('parent','student','tutor','centre','school','govt_school','govt_institution','partner','other')),
  name text not null,
  organisation text,
  phone text,
  email text,
  city text,
  state text,
  board text,
  class_level text,
  subjects text,
  source text,
  stage text not null default 'new_lead',
  status text not null default 'open' check (status in ('open','won','lost','paused')),
  first_contact date,
  last_contact date,
  next_followup date,
  interest text,
  objections text,
  plan_discussed text,
  price_discussed integer,
  amount_paid integer,
  potential_value integer,
  probability integer check (probability between 0 and 100),
  owner text,
  tags text,
  notes text,
  extra jsonb not null default '{}'::jsonb,   -- school/institution fields: principal, coordinator, decision_maker, pilot_status, pilot_students, pilot_start, pilot_end, procurement_route, ...
  user_id uuid,                               -- optional link to a Sahayak account (users.id)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_kind_stage on crm_records(kind, stage);
create index if not exists idx_crm_followup on crm_records(next_followup) where status = 'open';
alter table crm_records enable row level security;

-- 3. Investors, government schemes, incubators, accelerators, CSR, debt.
-- Unknown facts stay NULL and are shown as "UNKNOWN - VERIFY". Every record carries a source, a verified date and a confidence.
create table if not exists funding_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('investor','government','incubator','accelerator','csr','debt','other')),
  subtype text,                     -- HNI, Angel, VC, Family office, Startup India, ...
  name text not null,
  organisation text,
  website text,
  linkedin text,
  location text,
  country text,
  sector_focus text,
  stage_preference text,
  cheque_min integer,
  cheque_max integer,
  geography text,
  traction_requirement text,
  previous_investments text,
  why_fit text,
  warm_intro boolean,
  intro_source text,
  contact_person text,
  email text,
  phone text,
  source text,                      -- where this information came from
  last_verified date,
  confidence text not null default 'unknown' check (confidence in ('unknown','low','medium','high')),
  stage text not null default 'researching',
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  amount_requested integer,
  amount_offered integer,
  amount_received integer,
  valuation_note text,
  instrument text,
  next_action text,
  next_followup date,
  deadline date,
  eligibility_status text not null default 'needs_verification',
  documents_required text,
  reason_rejected text,
  fit jsonb not null default '{}'::jsonb,   -- criterion -> rating 0..5 (the founder's own ratings)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funding_kind_stage on funding_records(kind, stage);
alter table funding_records enable row level security;

-- 4. Every conversation / action on a CRM or funding record.
create table if not exists crm_activities (
  id uuid primary key default gen_random_uuid(),
  record_table text not null check (record_table in ('crm','funding')),
  record_id uuid not null,
  kind text not null default 'note',
  note text not null,
  by_email text,
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_activities_rec on crm_activities(record_table, record_id, created_at desc);
alter table crm_activities enable row level security;

-- 5. Funding document checklist.
create table if not exists funding_documents (
  key text primary key,
  label text not null,
  sort integer not null default 100,
  status text not null default 'missing' check (status in ('missing','needs_update','complete')),
  notes text,
  updated_at timestamptz not null default now()
);
alter table funding_documents enable row level security;
insert into funding_documents (key, label, sort) values
 ('founder_profile','Founder profile',1),('company_info','Company information',2),('product_overview','Product overview',3),('pitch_deck','Pitch deck',4),
 ('one_page','One-page summary',5),('problem','Problem statement',6),('solution','Solution',7),('market','Market',8),('competitive','Competitive analysis',9),
 ('moat','Moat',10),('tech_arch','Technology architecture',11),('ai_arch','AI architecture',12),('data_arch','Data architecture',13),('traction','Traction',14),
 ('user_metrics','User metrics',15),('revenue','Revenue',16),('unit_economics','Unit economics',17),('testimonials','Customer testimonials',18),
 ('learning_outcomes','Learning outcome evidence',19),('handwritten_evidence','Handwritten evaluation evidence',20),('business_model','Business model',21),
 ('pricing','Pricing',22),('gtm','Go-to-market',23),('projections','Financial projections',24),('funding_ask','Funding requirement',25),('use_of_funds','Use of funds',26),
 ('cap_table','Cap table',27),('incorporation','Incorporation documents (if applicable)',28),('dpiit','DPIIT documents (if applicable)',29),('ip','IP ownership',30),
 ('terms_privacy','Terms / privacy documents',31),('other_dd','Other due diligence documents',32)
on conflict (key) do nothing;

-- 6. Expenses the founder records (the app cannot see bank accounts). AI cost is read separately from ai_usage.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null,
  category text not null check (category in ('ai_api','infrastructure','teacher','evaluator','content','reviewer','marketing','referral','legal_accounting','other')),
  description text,
  vendor text,
  amount_inr integer not null check (amount_inr >= 0),
  recurring boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_expenses_date on expenses(spent_on);
alter table expenses enable row level security;

-- 7. Founder tasks.
create table if not exists founder_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text,
  priority text not null default 'p1' check (priority in ('p0','p1','p2')),
  due date,
  status text not null default 'open' check (status in ('open','done')),
  notes text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table founder_tasks enable row level security;

-- 8. System change log and project memory (so a future Claude session or another AI can pick up without losing decisions).
create table if not exists system_changelog (
  id uuid primary key default gen_random_uuid(),
  changed_on date not null default current_date,
  version text,
  change text not null,
  reason text,
  files text,
  database_changes text,
  pricing_changes text,
  ai_model_changes text,
  deployment text,
  created_at timestamptz not null default now()
);
alter table system_changelog enable row level security;

create table if not exists founder_memory (
  section text primary key,
  title text not null,
  body text not null default '',
  sort integer not null default 100,
  updated_at timestamptz not null default now()
);
alter table founder_memory enable row level security;
insert into founder_memory (section, title, sort) values
 ('vision','Product vision',1),('market','Target market',2),('stage','Current MVP version and stage',3),('architecture','Current architecture',4),
 ('pricing','Current pricing',5),('assumptions','Business assumptions',6),('investor_strategy','Investor strategy',7),('school_strategy','School strategy',8),
 ('funding_strategy','Funding strategy',9),('roadmap','Product roadmap',10),('limits','Known limitations',11),('tasks','Outstanding tasks',12),
 ('decisions','Decisions made',13),('rejected','Rejected ideas',14),('notes','Important implementation notes',15)
on conflict (section) do nothing;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select d, v, c, r, db, p, 'Delta zip + INSTRUCTIONS.txt' from (values
 ('2026-10-19'::date,'v52','Logo, equation formatting, PDF download, linked parent+child sign-up','Founder request','none','',''),
 ('2026-10-19','v53','Non-repeating diagnostics; question bank grows 50 per session start','Founder request','0028 question_bank_growth','',''),
 ('2026-10-20','v54','Database-driven pricing, offers, credits, offline UPI payment, free limits, willingness-to-pay','Pricing prompt','0029 commerce tables','Founding Family 7,999; subject plans 1,499-6,999; mock 499; Tutor 3,499/mo; Centre 9,999/mo',''),
 ('2026-10-20','v54b','Tutor/centre seats and credit pool, parent purchase, paid reports, review statuses, read-aloud','Founder request','0030 seats/entitlements/review','none',''),
 ('2026-10-20','v55','Founder Command Centre, CRM, funding and schools, expenses, tasks, change log, project memory','Founder request','0031 founder tables','none','')
) as t(d, v, c, r, db, p, x)
where not exists (select 1 from system_changelog);

-- 9. Settings the founder can edit (probabilities and thresholds are PLANNING ASSUMPTIONS, labelled as such on screen).
insert into commerce_settings (key, value, note) values
 ('funding_probabilities', '{"researching":0,"shortlisted":2,"warm_intro_needed":2,"introduction_requested":5,"contacted":5,"initial_conversation":10,"deck_sent":15,"due_diligence":40,"term_discussion":60,"committed":90,"funds_received":100,"passed":0,"future_follow_up":2}', 'ASSUMED chance (%) that each investor stage ends in money. Used for the weighted pipeline. Change to your own judgement.'),
 ('crm_probabilities', '{"new_lead":5,"contacted":10,"interested":25,"demo":35,"trial_pilot":50,"negotiation":65,"payment_pending":85,"paid":100,"active":100,"renewal_upsell":100,"referral":100}', 'ASSUMED chance (%) a lead at each stage becomes paid. Used for the weighted sales pipeline.'),
 ('rag', '{"diagnostic_completion":{"green":60,"amber":40},"weekly_active_of_total":{"green":30,"amber":15},"return_within_7_days":{"green":40,"amber":20},"paid_conversion":{"green":5,"amber":2},"contribution_margin":{"green":50,"amber":20},"handwritten_human_review":{"green":30,"amber":50}}', 'Green/amber thresholds (percent). ASSUMED starting points; set your own.'),
 ('fit_weights', '{"education":3,"ai":2,"edtech":3,"stage":3,"cheque":2,"india":2,"strategic":2,"warm_intro":2,"portfolio":2,"founder":1}', 'Weights for the Internal Sahayak Fit Score (0 = ignore). Your own judgement, not an objective truth.'),
 ('business', '{"assumed_lifetime_months":null,"product_stage":"CBSE Class X 2027"}', 'assumed_lifetime_months is YOUR assumption for lifetime value. Empty = lifetime value shows Insufficient data.')
on conflict (key) do nothing;

-- 10. Money received that is NOT a student's plan payment (tutor / centre / school / other, UPI, bank, cash). Recorded by the founder.
create table if not exists revenue_entries (
  id uuid primary key default gen_random_uuid(),
  received_on date not null,
  customer_kind text not null default 'other' check (customer_kind in ('parent','student','tutor','centre','school','govt_school','govt_institution','partner','other')),
  customer_name text,
  product text,
  amount_inr integer not null check (amount_inr >= 0),
  method text not null default 'upi' check (method in ('upi','qr','bank_transfer','cash','other')),
  reference text,
  verified_by text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_revenue_entries_date on revenue_entries(received_on);
alter table revenue_entries enable row level security;
