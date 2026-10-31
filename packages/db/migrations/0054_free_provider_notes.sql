-- v88: facts read from the providers' own pages on 2026-10-31, written as NOTES on the candidate rows to save the founder time.
-- Nothing here makes a provider usable: status stays candidate, classification stays F (or E), free_tier_available stays blank, the 9 checks stay unticked.
-- The founder must still verify the CURRENT official terms, then enter the limits, tick the checks and switch the provider on. Re-runnable; never overwrites a value the founder typed.
do $$ begin
  if to_regclass('public.ai_providers') is null then return; end if;

  update ai_providers set
    endpoint = coalesce(endpoint, 'https://openrouter.ai/api/v1/chat/completions'),
    source_url = coalesce(source_url, 'https://openrouter.ai/blog/tutorials/free-llm-apis-compared/'),
    free_quota_note = coalesce(free_quota_note, 'UNVERIFIED. A page dated 2026-09-24 says free models allow 20 requests/minute and 50 requests/day without bought credit (1,000/day after a $10 top-up, which is paying). Free models are named with a :free ending and change often. Each underlying free model has its own terms and data policy: check them before sending any student text.'),
    notes = case when coalesce(notes,'') like '%[v88]%' then notes else coalesce(notes,'') || ' [v88] Endpoint from the provider page. 50 requests/day is small: useful only as an extra fallback. Do not top up to raise the limit (that is paid use).' end
  where id = 'openrouter';

  update ai_providers set
    source_url = coalesce(source_url, 'https://developers.cloudflare.com/workers-ai/platform/pricing/'),
    free_quota_note = coalesce(free_quota_note, 'UNVERIFIED. Official pricing page (read 2026-10-31): 10,000 Neurons/day free. On the FREE Workers plan, going over is NOT billed: further calls fail with an error until 00:00 UTC. On the Workers PAID plan, extra use is billed at $0.011 per 1,000 Neurons. Use an account on the Free plan so this route can never cost money.'),
    notes = case when coalesce(notes,'') like '%[v88]%' then notes else coalesce(notes,'') || ' [v88] The endpoint contains your Cloudflare account id, so it must be typed by you from the Cloudflare docs (OpenAI-compatible chat endpoint). The key name must be set on the server.' end
  where id = 'cloudflare';

  update ai_providers set
    source_url = coalesce(source_url, 'https://docs.mistral.ai/deployment/laplateforme/tier'),
    free_quota_note = coalesce(free_quota_note, 'UNVERIFIED. Mistral''s page (read 2026-10-31) says the free API tier has "restrictive rate limits" and gives no numbers; current limits are shown in your own Mistral console under Limits. Commercial-use and data-training terms were not on that page: read Mistral''s terms before using it for students.'),
    notes = case when coalesce(notes,'') like '%[v88]%' then notes else coalesce(notes,'') || ' [v88] Enter the limits you see in your console into the daily/minute limit boxes so quota protection works.' end
  where id = 'mistral';

  update ai_providers set
    source_url = coalesce(source_url, 'https://cerebras.ai/pricing'),
    free_quota_note = coalesce(free_quota_note, 'UNVERIFIED and probably NOT a free tier. Official pricing page (read 2026-10-31): a one-time $5 promotional credit that needs a payment method and expires 30 days after activation, after which access pauses unless credit is bought; footnote says development/evaluation use, not intended for production. Treat as a short trial, not capacity.'),
    notes = case when coalesce(notes,'') like '%[v88]%' then notes else coalesce(notes,'') || ' [v88] Do not rely on this for students.' end
  where id = 'cerebras';
end $$;
notify pgrst, 'reload schema';
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-31', 'v88', 'Free AI capacity: cost guard on the backup chain, Free capacity panel, notes on candidate free providers', 'Founder request: more free AI without more cost', '0054 notes/endpoint hints on candidate ai_providers rows only', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v88');
