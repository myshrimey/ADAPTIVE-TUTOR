-- v55b: AI Gateway. Provider registry, richer AI usage log, benchmark tables, gateway settings. Re-runnable.
-- Server only: RLS on, no policies (only the admin pages / gateway with the service key touch these).
-- NOTHING here is a verified provider fact. Every unknown stays NULL and is shown as "UNKNOWN - VERIFY".

-- 1. Provider registry (one row = one provider + one model). API KEYS ARE NEVER STORED HERE: key_env is only the NAME of the server environment variable.
create table if not exists ai_providers (
  id text primary key,                       -- slug, also what ai_usage.provider holds
  adapter text not null check (adapter in ('gemini','groq','openai','claude','openai_compatible')),
  provider_name text not null,
  region text,                               -- company home country/region (processing region NOT verified)
  model text,
  model_version text,
  endpoint text,                             -- full https chat-completions URL (openai_compatible only)
  auth_method text not null default 'bearer',
  key_env text,                              -- e.g. DEEPSEEK_API_KEY (name only)
  priority integer not null default 100,     -- lower = tried earlier
  status text not null default 'candidate' check (status in ('candidate','testing','active','paused','retired')),
  classification text not null default 'F' check (classification in ('A','B','C','D','E','F')),
  free_tier_available boolean,
  free_quota_note text,
  rpm integer, rpd integer, tpm integer, tpd integer,
  input_price_usd_m numeric, output_price_usd_m numeric, image_price_usd numeric, audio_stt_price_usd numeric, tts_price_usd numeric,
  context_window integer,
  languages text,
  vision boolean, structured_output boolean, tool_calling boolean,
  commercial_use text not null default 'unknown' check (commercial_use in ('yes','no','unknown')),
  data_policy text,
  policy_status text not null default 'unknown' check (policy_status in ('unknown','acceptable','not_acceptable')),
  verification_required text,
  free_tier_expiry date,
  quota_reset text not null default 'daily' check (quota_reset in ('daily','monthly','none')),
  last_verified date,
  source_url text,
  verification jsonb not null default '{}'::jsonb,  -- checklist: check -> true/false
  legacy boolean not null default false,            -- already used in production before v55b (exempt from the 9-check rule)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table ai_providers enable row level security;

-- Providers already in production (v36+). NOT re-verified: last_verified stays empty; prices are the planning numbers from usage.ts.
insert into ai_providers (id, adapter, provider_name, region, model, key_env, priority, status, classification, free_tier_available, free_quota_note, input_price_usd_m, output_price_usd_m, vision, legacy, notes) values
 ('gemini','gemini','Google Gemini','United States','gemini-3.8-flash','GEMINI_API_KEY',10,'active','B',true,'Free tier assumed since v36. NOT re-verified against current Google documentation.',0.3,2.5,true,true,'Existing provider. Verify current free quota and terms before relying on it.'),
 ('gemini_2','gemini','Google Gemini (second key)','United States','gemini-3.8-flash','GEMINI_API_KEY_2',11,'active','B',true,'Second key of the same provider. Quota is per key/project: verify.',0.3,2.5,true,true,'Existing provider (second API key).'),
 ('groq','groq','Groq','United States','llama-3.3-70b-versatile','GROQ_API_KEY',20,'active','B',true,'Free tier assumed since v36. NOT re-verified.',0.59,0.79,false,true,'Existing provider. Text only.'),
 ('openai','openai','OpenAI (API)','United States','gpt-4o-mini','OPENAI_API_KEY',90,'active','D',false,'Paid API. ChatGPT Free is NOT free API access.',0.15,0.6,false,true,'Existing paid fallback. Used only if the founder switches on the paid-budget rule.'),
 ('claude','claude','Anthropic Claude (API)','United States','claude-haiku-4-5-20251001','ANTHROPIC_API_KEY',91,'active','D',false,'Paid API. Claude Free is NOT free API access.',1.0,5.0,false,true,'Existing paid fallback. Used only if the founder switches on the paid-budget rule.')
on conflict (id) do nothing;

-- Candidates to investigate. No endpoint, model, price or free-tier claim is made: classification F (not approved) until the founder verifies them from CURRENT official documentation.
insert into ai_providers (id, adapter, provider_name, region, key_env, priority, status, classification, notes) values
 ('deepseek','openai_compatible','DeepSeek','China','DEEPSEEK_API_KEY',30,'candidate','F','Candidate. Verify current docs, terms and data policy.'),
 ('qwen','openai_compatible','Alibaba Cloud Qwen / Model Studio','China / Singapore','QWEN_API_KEY',31,'candidate','F','Candidate. Verify region, free quota, terms.'),
 ('cerebras','openai_compatible','Cerebras','United States','CEREBRAS_API_KEY',32,'candidate','F','Candidate.'),
 ('openrouter','openai_compatible','OpenRouter','United States','OPENROUTER_API_KEY',33,'candidate','F','Candidate. Free models change often; each underlying model has its own terms.'),
 ('sarvam','openai_compatible','Sarvam AI','India','SARVAM_API_KEY',34,'candidate','F','Candidate. Indian-language quality to be benchmarked. Adapter compatibility not verified.'),
 ('byteplus','openai_compatible','BytePlus ModelArk / Seed','Singapore / China','BYTEPLUS_API_KEY',35,'candidate','F','Candidate.'),
 ('mistral','openai_compatible','Mistral AI','France','MISTRAL_API_KEY',40,'candidate','F','Secondary / test.'),
 ('cohere','openai_compatible','Cohere','Canada','COHERE_API_KEY',41,'candidate','F','Secondary / test. Adapter compatibility not verified.'),
 ('zai','openai_compatible','Z.ai / GLM','China','ZAI_API_KEY',42,'candidate','F','Secondary / test.'),
 ('cloudflare','openai_compatible','Cloudflare Workers AI','United States','CLOUDFLARE_API_KEY',43,'candidate','F','Secondary / test. Adapter compatibility not verified.'),
 ('huggingface','openai_compatible','Hugging Face Inference Providers','United States / France','HUGGINGFACE_API_KEY',44,'candidate','F','Secondary / test.'),
 ('llama_hosted','openai_compatible','Meta Llama (hosted by a third party)','varies','LLAMA_HOST_API_KEY',45,'candidate','E','Open-weight. Hosted inference is not automatically free: choose and verify a host.'),
 ('falcon_hosted','openai_compatible','Falcon (hosted by a third party)','varies','FALCON_HOST_API_KEY',46,'candidate','E','Open-weight. Choose and verify a host.'),
 ('minimax','openai_compatible','MiniMax','China','MINIMAX_API_KEY',47,'candidate','F','Secondary / test.'),
 ('moonshot','openai_compatible','Kimi / Moonshot','China','MOONSHOT_API_KEY',48,'candidate','F','Secondary / test.'),
 ('xai','openai_compatible','xAI Grok (API)','United States','XAI_API_KEY',92,'candidate','D','Optional paid. Grok Free is NOT free API access.')
on conflict (id) do nothing;

-- 2. Richer AI usage log (old columns unchanged; old rows keep NULLs). Still NO prompt or answer text.
alter table ai_usage add column if not exists model text;
alter table ai_usage add column if not exists task text;
alter table ai_usage add column if not exists task_tier integer;
alter table ai_usage add column if not exists images integer not null default 0;
alter table ai_usage add column if not exists cost_est_inr numeric;      -- what the call would cost at the registry list price
alter table ai_usage add column if not exists cost_inr numeric;          -- what is billed (0 on a free route)
alter table ai_usage add column if not exists free_quota_used boolean not null default false;
alter table ai_usage add column if not exists ref text;                  -- e.g. a mock exam id, so cost per handwritten evaluation can be added up
alter table ai_usage add column if not exists status_code integer;
create index if not exists idx_ai_usage_provider_day on ai_usage(provider, created_at desc);
create index if not exists idx_ai_usage_ref on ai_usage(ref) where ref is not null;
create index if not exists idx_ai_usage_billed on ai_usage(created_at desc) where cost_inr > 0;

-- 3. Benchmark: a small fixed test set the founder/teachers grow, and the runs against each model.
create table if not exists ai_benchmark_cases (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  board text not null default 'CBSE',
  class_level text,
  subject text,
  language text not null default 'en',
  kind text not null default 'short' check (kind in ('mcq','numeric','short','explain','translate')),
  prompt text not null,
  expected text,                       -- auto-marked when present (mcq/numeric/short); otherwise a person grades the output
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table ai_benchmark_cases enable row level security;

create table if not exists ai_benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references ai_providers(id) on delete cascade,
  model text,
  model_version text,
  run_at timestamptz not null default now(),
  cases integer not null default 0,
  auto_total integer not null default 0,
  auto_correct integer not null default 0,
  failures integer not null default 0,
  latency_ms_avg integer,
  cost_inr numeric not null default 0,
  scores jsonb not null default '{}'::jsonb,   -- manual 0-5 ratings: factual, reasoning, cbse_alignment, explanation, marking_scheme, multilingual, hallucination, safety
  quality_score numeric,                       -- 0-100, see benchmark.ts qualityScore()
  notes text
);
create index if not exists idx_ai_bench_runs_provider on ai_benchmark_runs(provider_id, run_at desc);
alter table ai_benchmark_runs enable row level security;

create table if not exists ai_benchmark_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references ai_benchmark_runs(id) on delete cascade,
  case_id uuid not null references ai_benchmark_cases(id) on delete cascade,
  output text,
  ok boolean not null default true,
  auto_correct boolean,
  latency_ms integer,
  manual_score integer check (manual_score is null or manual_score between 0 and 5),
  error text
);
create index if not exists idx_ai_bench_results_run on ai_benchmark_results(run_id);
alter table ai_benchmark_results enable row level security;

-- A TINY starter set whose answers are plain facts. It is NOT the Class IX-XII benchmark the spec describes; grow it from /admin/ai-infrastructure.
insert into ai_benchmark_cases (key, class_level, subject, language, kind, prompt, expected, notes) values
 ('starter-m1','10','Mathematics','en','numeric','Find the HCF of 12 and 18.','6','starter'),
 ('starter-m2','10','Mathematics','en','numeric','Solve for x: 2x + 3 = 11.','4','starter'),
 ('starter-m3','10','Mathematics','en','numeric','What is the sum of the first 10 natural numbers?','55','starter'),
 ('starter-m4','10','Mathematics','en','numeric','Find the discriminant of x^2 - 5x + 6 = 0.','1','starter'),
 ('starter-s1','10','Science','en','short','What is the SI unit of electric current? (one word)','ampere','starter'),
 ('starter-s2','10','Science','en','short','What is the chemical formula of baking soda?','NaHCO3','starter'),
 ('starter-s3','10','Science','en','numeric','What is the pH of a neutral solution at 25 degrees Celsius?','7','starter'),
 ('starter-h1','10','Mathematics','hi','numeric','12 और 18 का महत्तम समापवर्तक (HCF) क्या है?','6','starter Hindi'),
 ('starter-e1','10','Science','en','explain','Explain in two sentences why a concave mirror can form a real image.',null,'Needs a person to grade.')
on conflict (key) do nothing;

-- 4. Gateway settings. Same table as pricing; edited only from /admin/ai-infrastructure (validated there).
insert into commerce_settings (key, value, note) values
 ('ai_gateway', '{"primary_provider":"gemini","primary_model":null,"fallback_provider":"groq","fallback_model":null,"free_only_mode":true,"allow_paid_fallback":false,"max_daily_spend_inr":null,"max_monthly_spend_inr":null,"max_cost_per_user_inr":null,"max_cost_per_feature_inr":null,"max_handwritten_eval_inr":null,"max_calls_per_user_day":500,"quota_warn_pct":80,"quota_critical_pct":90,"block_unknown_policy":false,"handwriting_min_quality":null,"routes":{}}', 'AI gateway controls. free_only_mode=true means NO paid provider is ever used. Paid use needs allow_paid_fallback AND both daily and monthly caps.')
on conflict (key) do nothing;
