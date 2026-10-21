-- v54: commercial layer. Prices, limits, offers, credits and payment requests live in the DATABASE so the founder can
-- change them at /admin/pricing without code. Re-runnable: tables use "if not exists"; seed rows use "on conflict do nothing"
-- (so a re-run never overwrites a price the founder has edited). Everything is server-written (service key); students and
-- parents have NO write policy. Extends pilot_payments and student_access instead of making duplicates.

create table if not exists commerce_products (
  code text primary key,
  kind text not null check (kind in ('family','individual','subject','mock','tutor','centre')),
  name text not null,
  subtitle text,
  price_inr integer not null check (price_inr >= 0),
  list_price_inr integer,                       -- shown struck-through when higher than price_inr
  billing text not null default 'one_time' check (billing in ('one_time','monthly','per_item')),
  subject_count integer,                        -- subjects included (null = not subject based)
  validity_until date,                          -- fixed end date (e.g. 2027-03-31); null = use validity_days
  validity_days integer,
  mock_credits integer not null default 0,      -- handwritten evaluation credits granted ONCE on activation
  credits_per_month integer not null default 0, -- extra credits granted each calendar month while active
  student_limit integer,                        -- tutor/centre seat limit
  recommended boolean not null default false,
  founding boolean not null default false,
  on_sale boolean not null default true,
  sort integer not null default 100,
  features text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table commerce_products enable row level security;

create table if not exists commerce_offers (
  code text primary key,
  label text not null,
  product_code text not null default 'any',     -- a product code or 'any'
  kind text not null check (kind in ('percent','fixed','price')),
  value integer not null check (value >= 0),    -- percent, rupees off, or the new price
  coupon_code text unique,                      -- null = applies automatically while active
  active boolean not null default false,
  starts_on date,
  ends_on date,
  max_uses integer,
  used integer not null default 0,
  note text,
  updated_at timestamptz not null default now()
);
alter table commerce_offers enable row level security;

create table if not exists commerce_settings (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);
alter table commerce_settings enable row level security;

create table if not exists mock_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref text not null,                            -- idempotency key: the same ref can never be applied twice
  created_at timestamptz not null default now(),
  unique (student_id, ref)
);
alter table mock_credit_ledger enable row level security;
drop policy if exists mock_credit_ledger_owner_read on mock_credit_ledger;
create policy mock_credit_ledger_owner_read on mock_credit_ledger for select
  using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));

create table if not exists commerce_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  user_id uuid,
  student_id uuid,
  product_code text,
  amount integer,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_commerce_events_event on commerce_events(event, created_at);
alter table commerce_events enable row level security;

create table if not exists commerce_interest (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('tutor','centre','partner','subject_request','other')),
  name text,
  organisation text,
  contact text,
  detail text,
  students integer,
  interest_level text,
  user_id uuid,
  ip_hash text,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now()
);
alter table commerce_interest enable row level security;

create table if not exists wtp_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  student_id uuid,
  user_type text,
  feature text not null,
  price_inr integer,
  answer text not null check (answer in ('yes','maybe','no')),
  created_at timestamptz not null default now(),
  unique (user_id, feature)
);
alter table wtp_responses enable row level security;

-- Extend what already exists
alter table pilot_payments add column if not exists product_code text;
alter table pilot_payments add column if not exists list_amount numeric(10,2);
alter table pilot_payments add column if not exists discount_amount numeric(10,2) not null default 0;
alter table pilot_payments add column if not exists offer_code text;
alter table pilot_payments add column if not exists quantity integer not null default 1;
alter table pilot_payments add column if not exists subject_slugs text[];
alter table pilot_payments add column if not exists activated_at timestamptz;
alter table pilot_payments add column if not exists activated_by text;
alter table pilot_payments add column if not exists payment_method text not null default 'upi';
create unique index if not exists uq_pilot_payments_ref on pilot_payments (student_id, transaction_reference)
  where transaction_reference is not null and status in ('pending','confirmed');
alter table student_access add column if not exists product_code text;
alter table student_access add column if not exists starts_on date;
alter table mock_exams add column if not exists max_pages integer;
alter table mock_exams add column if not exists eval_runs integer not null default 0;

-- ---- Seed (never overwrites edited rows) ---------------------------------------------------------------
insert into commerce_products (code, kind, name, subtitle, price_inr, billing, subject_count, validity_until, mock_credits, credits_per_month, recommended, founding, sort, features) values
 ('founding_family_2027','family','Founding Family Plan','Complete Class X 2027 preparation',7999,'one_time',5,'2027-03-31',0,5,true,true,10,
  array['Comprehensive diagnostic','Adaptive learning','CBSE-aligned practice','Chapter and competency assessments','Board preparation','Parent dashboard','Progress and confidence trends','Board readiness','Handwritten mock evaluations (5 a month)','Class XI transition assessment','Founding-family future benefits']),
 ('founding_individual_2027','individual','Founding Individual Plan','One subject, Class X 2027',1499,'one_time',1,'2027-03-31',1,0,false,true,20,
  array['Subject diagnostic','Readiness assessment','Personalised learning and adaptive practice','Chapter and topic tests','Progress and error analysis','Basic parent report','1 handwritten mock evaluation']),
 ('subject_1_2027','subject','1 subject plan','Choose 1 subject',1499,'one_time',1,'2027-03-31',1,0,false,false,30,array['Everything for your chosen subject','1 handwritten mock evaluation']),
 ('subject_2_2027','subject','2 subjects plan','Choose 2 subjects',2499,'one_time',2,'2027-03-31',1,0,false,false,31,array['Everything for your chosen subjects','1 handwritten mock evaluation']),
 ('subject_3_2027','subject','3 subjects plan','Choose 3 subjects',3499,'one_time',3,'2027-03-31',2,0,false,false,32,array['Everything for your chosen subjects','2 handwritten mock evaluations']),
 ('subject_4_2027','subject','4 subjects plan','Choose 4 subjects',4999,'one_time',4,'2027-03-31',3,0,false,false,33,array['Everything for your chosen subjects','3 handwritten mock evaluations']),
 ('subject_5_2027','subject','5 subjects plan','Choose 5 subjects',6999,'one_time',5,'2027-03-31',4,0,false,false,34,array['Everything for your chosen subjects','4 handwritten mock evaluations']),
 ('handwritten_mock','mock','Handwritten Mock Evaluation','Write on paper, upload your answers, get structured feedback',499,'per_item',null,null,1,0,false,false,40,
  array['Question-wise evaluation','Marks','Error analysis','Concept gaps','Recommendations','Board-oriented feedback']),
 ('founding_tutor','tutor','Founding Tutor Plan','Independent tutors, up to 20 active students',3499,'monthly',null,null,0,20,false,true,50,array['Student management','Diagnostics and assessments','Progress and weak-area tracking','Parent-ready reports','20 handwritten evaluation credits a month']),
 ('founding_centre','centre','Founding Coaching Centre Plan','Up to 50 active students',9999,'monthly',null,null,0,50,false,true,60,array['Centre dashboard','Batch and student management','Diagnostics and assessments','Batch and student analytics','Parent reports','50 handwritten evaluation credits a month'])
on conflict (code) do nothing;
update commerce_products set student_limit = 20 where code = 'founding_tutor' and student_limit is null;
update commerce_products set student_limit = 50 where code = 'founding_centre' and student_limit is null;

insert into commerce_offers (code, label, product_code, kind, value, active, note) values
 ('mock_launch_399','Handwritten mock launch offer','handwritten_mock','price',399,false,'Switch on to show 499 struck through and 399 as the offer price.')
on conflict (code) do nothing;

insert into commerce_settings (key, value, note) values
 ('founding_access', '{"start":null,"end":"2027-03-31","label":"Founding Access / Product Validation Phase"}', 'Dates of the founding-access phase. Used for the default plan end date and page wording.'),
 ('free_limits', '{"tutor_replies_per_day":10,"quiz_questions_per_day":60,"voice_per_day":5,"visual_per_day":3}', 'Daily limits on the free plan. voice/visual are stored for later; they only work when those features exist.'),
 ('paid_limits', '{"tutor_replies_per_day":100}', 'Daily limits on paid plans.'),
 ('handwritten', '{"credits_required":false,"default_max_pages":8,"min_pages":2,"max_pages":16,"marks_per_page":8,"max_upload_mb":8,"max_runs":3}', 'credits_required=false keeps the old behaviour (no credit needed). Turn on when you are ready to charge.'),
 ('payment_instructions', '{"upi_id":"","qr_image_url":"","payee_name":"","extra":""}', 'YOU enter the UPI ID / QR link here. The app never invents one.'),
 ('economics', '{"ai_cost_per_image_inr":null,"ai_cost_per_eval_base_inr":null,"human_review_cost_inr":null,"infra_per_eval_inr":null}', 'Your cost ASSUMPTIONS (rupees). Leave empty if unknown: the dashboard then says Insufficient data.'),
 ('wtp', '{"enabled":true,"features":{"board_readiness":[199,299,399,499,699,999],"handwritten_mock":[299,399,499,699]},"max_asks_per_user":2}', 'Willingness-to-pay questions. Each feature is asked at most once per user.'),
 ('feature_flags', '{"plans_page":true,"wtp_questions":true,"tutor_centre_applications":true}', 'On/off switches.')
on conflict (key) do nothing;
