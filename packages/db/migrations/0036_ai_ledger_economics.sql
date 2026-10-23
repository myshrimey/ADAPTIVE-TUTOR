-- v59: AI request ledger, cost layers, registry extension, evaluation economics, benchmark breakdown. Re-runnable. Server only (RLS on, no policies).

-- 1. Request-level ledger. One AI request can have several attempts (retry / fallback): they share request_id.
alter table ai_usage add column if not exists request_id uuid;
alter table ai_usage add column if not exists attempt_no integer not null default 1;
alter table ai_usage add column if not exists user_id uuid;
alter table ai_usage add column if not exists organisation_id uuid;
alter table ai_usage add column if not exists model_version text;
alter table ai_usage add column if not exists retry_count integer not null default 0;
alter table ai_usage add column if not exists fallback_count integer not null default 0;
alter table ai_usage add column if not exists fallback_reason text;
alter table ai_usage add column if not exists audio_seconds numeric;
alter table ai_usage add column if not exists quota_type text;            -- free_quota | promo_credit | paid | unknown
alter table ai_usage add column if not exists list_cost_inr numeric;      -- published list price for these tokens
alter table ai_usage add column if not exists free_quota_value_inr numeric not null default 0;   -- list price that a free quota covered
alter table ai_usage add column if not exists promo_credit_inr numeric not null default 0;       -- list price that a promotional credit covered
alter table ai_usage add column if not exists actual_cost_inr numeric;    -- provider's real charge, only when known (reconciliation); null otherwise
alter table ai_usage add column if not exists economic_cost_inr numeric;  -- what Sahayak counts in unit economics (list price: a free quota is never treated as permanently free)
alter table ai_usage add column if not exists pricing_snapshot jsonb;     -- the rates and exchange rate used, so the row can always be explained
alter table ai_usage add column if not exists quality_result text;        -- passed | failed | not_checked
alter table ai_usage add column if not exists route_explanation jsonb;    -- ADMIN ONLY: why this model was chosen
create index if not exists idx_ai_usage_request on ai_usage(request_id) where request_id is not null;
create index if not exists idx_ai_usage_user on ai_usage(user_id, created_at desc) where user_id is not null;

-- 2. Registry: exact model + plan/quota, never "the provider is free".
alter table ai_providers add column if not exists quota_type text not null default 'unknown' check (quota_type in ('free_quota','promo_credit','paid','unknown'));
alter table ai_providers add column if not exists quota_region text;
alter table ai_providers add column if not exists promo_credit_balance_inr numeric;
alter table ai_providers add column if not exists promo_credit_expiry date;
alter table ai_providers add column if not exists promo_credit_as_of timestamptz;   -- balance was entered at this moment; credit used after it is subtracted
alter table ai_providers add column if not exists capabilities jsonb not null default '{}'::jsonb;   -- e.g. {"vision":true,"hindi":true,"ocr":true,"json":true}; missing key = unknown
alter table ai_providers add column if not exists production_status text not null default 'unknown' check (production_status in ('unknown','test_only','pilot','production'));
alter table ai_providers add column if not exists price_last_verified date;
-- the providers already used in production since v36 keep working: treat them as production, quota type follows their free flag
update ai_providers set production_status = 'production' where legacy = true and production_status = 'unknown';
update ai_providers set quota_type = case when free_tier_available is true then 'free_quota' when free_tier_available is false then 'paid' else 'unknown' end where quota_type = 'unknown' and legacy = true;

-- 3. Provider invoices, entered by hand, so the app can compare its own billed estimate with the real charge.
create table if not exists ai_reconciliations (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references ai_providers(id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  actual_inr numeric not null check (actual_inr >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique (provider_id, period)
);
alter table ai_reconciliations enable row level security;

-- 4. One row per handwritten evaluation: cost, price, contribution, margin.
create table if not exists ai_evaluation_costs (
  exam_id uuid primary key,
  student_id uuid references students(id) on delete set null,
  exam_label text,
  questions integer not null default 0,
  images integer not null default 0,
  ai_calls integer not null default 0,
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  ai_list_cost_inr numeric not null default 0,
  ai_billed_cost_inr numeric not null default 0,
  ai_economic_cost_inr numeric not null default 0,
  storage_cost_inr numeric,
  processing_cost_inr numeric,
  human_review_cost_inr numeric,
  total_variable_cost_inr numeric,
  selling_price_inr numeric,
  price_basis text,                       -- target | actual
  contribution_inr numeric,
  margin_pct numeric,
  margin_at_risk boolean not null default false,
  incomplete text,                        -- which cost inputs the founder has not entered yet
  computed_at timestamptz not null default now()
);
create index if not exists idx_ai_eval_costs_student on ai_evaluation_costs(student_id);
alter table ai_evaluation_costs enable row level security;

-- 5. Benchmark: what each run covered and how it did by subject / class / language.
alter table ai_benchmark_runs add column if not exists subject text;
alter table ai_benchmark_runs add column if not exists class_level text;
alter table ai_benchmark_runs add column if not exists language text;
alter table ai_benchmark_runs add column if not exists task text;
alter table ai_benchmark_runs add column if not exists breakdown jsonb not null default '{}'::jsonb;
alter table ai_benchmark_runs add column if not exists cost_per_case_inr numeric;

-- 6. Economics settings (edited at /admin/ai-economics, validated there).
insert into commerce_settings (key, value, note) values
 ('ai_economics', '{"fx_usd_inr":88,"cap_basis":"billed","route_objective":"configured_order","spend_warn_pct":80,"spend_critical_pct":90,"handwritten_target_price_inr":499,"handwritten_min_margin_pct":85,"storage_cost_per_image_inr":null,"processing_cost_per_eval_inr":null,"quality_min":{},"max_cost_per_call_inr":{},"max_latency_ms":{}}'::jsonb, 'v59: AI economics assumptions. Nothing here is a verified provider fact.')
on conflict (key) do nothing;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-22', 'v59', 'AI request ledger, cost layers, routing explanation, economics dashboard, handwritten evaluation contribution, model switch simulator', 'Founder AI intelligence and economics audit prompt', 'Migration 0036: ai_usage ledger columns, ai_providers quota/capability columns, ai_reconciliations, ai_evaluation_costs, benchmark breakdown, setting ai_economics', 'None', 'Run npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v59');
