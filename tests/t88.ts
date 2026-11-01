import { readFileSync } from 'fs';
import { planRoute, freeCapacity, isLiveFreeRoute, DEFAULT_GATEWAY, createAIProvider, resetGatewayState } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync('' + p, 'utf8');
const P = (o: any = {}): any => ({ id: 'x', adapter: 'openai_compatible', provider_name: 'X', region: null, model: 'm', model_version: null, endpoint: 'https://x.example/v1/chat/completions', auth_method: 'bearer', key_env: 'X_KEY', priority: 50, status: 'active', classification: 'B', free_tier_available: true, free_quota_note: null, rpm: null, rpd: null, tpm: null, tpd: null, input_price_usd_m: 1, output_price_usd_m: 2, image_price_usd: null, audio_stt_price_usd: null, tts_price_usd: null, context_window: null, languages: null, vision: false, structured_output: null, tool_calling: null, commercial_use: 'unknown', data_policy: null, policy_status: 'unknown', verification_required: null, free_tier_expiry: null, quota_reset: 'daily', last_verified: null, source_url: null, verification: {}, legacy: true, notes: null, ...o });
const provs = [
  P({ id: 'gemini', adapter: 'gemini', priority: 10, rpd: 1000 }), P({ id: 'groq', adapter: 'groq', priority: 20, rpd: 500 }),
  P({ id: 'cloudflare', priority: 30, rpd: 300 }), P({ id: 'openrouter', priority: 33, rpd: 50 }),
  P({ id: 'openai', adapter: 'openai', priority: 90, classification: 'D', free_tier_available: false }), P({ id: 'claude', adapter: 'claude', priority: 91, classification: 'D', free_tier_available: false }),
];
const hasKey = () => true;
const route = (o: any = {}) => planRoute({ feature: 'tutor', needsImages: false, studentTier: 'free', config: DEFAULT_GATEWAY, providers: provs, usage: {}, hasKey, ...o });
// 1. more free routes = more chain, never a paid one
ok(route().chain.map((p) => p.id).join() === 'gemini,groq,cloudflare,openrouter', 'free student: only free routes, in priority order');
ok(route({ studentTier: 'paid' }).chain.map((p) => p.id).join() === 'gemini,groq,cloudflare,openrouter', 'paid student on free-only default: still only free routes');
ok(!route({ studentTier: 'paid', config: { ...DEFAULT_GATEWAY, allow_paid_fallback: true } }).chain.some((p) => p.id === 'openai'), 'allow_paid_fallback without free_only off and both caps: still no paid');
// 2. when every free route is used up the chain is EMPTY (the call is refused), it never becomes paid
const used = { gemini: { requests: 1000, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 }, groq: { requests: 500, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 }, cloudflare: { requests: 300, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 }, openrouter: { requests: 50, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 } };
const empty = route({ usage: used, studentTier: 'paid' });
ok(empty.chain.length === 0 && empty.skipped.some((s) => /free quota used up/.test(s.reason)) && empty.skipped.some((s) => /paid provider/.test(s.reason)), 'all free used up: refused, paid skipped with a reason');
// a new free route extends the chain while the others are used up
const withNew = planRoute({ feature: 'tutor', needsImages: false, studentTier: 'free', config: DEFAULT_GATEWAY, providers: [...provs, P({ id: 'mistral', priority: 40, rpd: 200 })], usage: used, hasKey });
ok(withNew.chain.map((p) => p.id).join() === 'mistral', 'adding one more free provider restores service with no paid route');
// 3. candidates (class F / candidate) are never routed
const cand = planRoute({ feature: 'tutor', needsImages: false, studentTier: 'free', config: DEFAULT_GATEWAY, providers: [...provs, P({ id: 'cerebras', priority: 32, status: 'candidate', classification: 'F', free_tier_available: null })], usage: {}, hasKey });
ok(!cand.chain.some((p) => p.id === 'cerebras'), 'a candidate/F provider is never used');
// 4. free capacity panel
const cap = freeCapacity([...provs, P({ id: 'cerebras', provider_name: 'Cerebras', priority: 32, status: 'candidate', classification: 'F', free_tier_available: null, key_env: 'CEREBRAS_API_KEY' })], { gemini: 100 }, (p) => p.id !== 'cerebras', '2026-10-31');
ok(cap.routes.length === 4 && cap.knownDailyRequests === 1850 && cap.routesWithoutLimit === 0, 'capacity sums only entered limits: ' + cap.knownDailyRequests);
ok(cap.routes[0].remaining === 900, 'remaining today');
ok(cap.candidates.length === 1 && cap.candidates[0].id === 'cerebras' && /key CEREBRAS_API_KEY/.test(cap.candidates[0].needs) && /candidate/.test(cap.candidates[0].needs) && /free tier exists/.test(cap.candidates[0].needs), 'candidate says exactly what is missing');
ok(!cap.candidates.some((c) => c.id === 'openai' || c.id === 'claude'), 'paid providers are not offered as free capacity');
const noLimit = freeCapacity([P({ id: 'a', rpd: null })], {}, hasKey, '2026-10-31'); ok(noLimit.knownDailyRequests === null && noLimit.routesWithoutLimit === 1, 'no limit entered: capacity unknown, never guessed');
ok(!isLiveFreeRoute(P({ free_tier_expiry: '2026-01-01' }), true, '2026-10-31') && !isLiveFreeRoute(P({ adapter: 'openai_compatible', endpoint: null }), true, '2026-10-31') && !isLiveFreeRoute(P({}), false, '2026-10-31'), 'expired, no endpoint or no key = not live');
// 5. the backup chain used when the registry cannot be read is free-only
ok(/tierlegacy|tier: 'free' as const/.test(R('packages/core/ai-provider/factory.ts')), 'legacy options are forced to free');
(async () => {
  resetGatewayState();
  const calls: string[] = []; const realFetch = globalThis.fetch;
  (globalThis as any).fetch = async (u: any) => { calls.push(String(u)); return new Response('{}', { status: 500 }); };
  process.env.OPENAI_API_KEY = 'sk-test'; process.env.ANTHROPIC_API_KEY = 'sk-ant-test'; delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY_2; delete process.env.GROQ_API_KEY;
  const broken: any = { from: () => { throw new Error('registry down'); } };
  const ai = createAIProvider({ service: broken, tier: 'paid', studentId: null });
  let err = ''; try { await ai.complete({ systemPrompt: 's', userMessage: 'u', feature: 'tutor' } as any); } catch (e: any) { err = String(e?.message ?? e); }
  (globalThis as any).fetch = realFetch;
  ok(!calls.some((u) => /openai\.com|anthropic\.com/.test(u)), 'registry down + paid student + paid keys present: NO call to a paid provider (calls: ' + calls.join(',') + ')');
  ok(err.length > 0, 'the call is refused instead of spending money');
  const mig = R('packages/db/migrations/0054_free_provider_notes.sql');
  ok(!/set[^;]*\b(status|classification|free_tier_available|rpd|rpm|policy_status|verification)\s*=/i.test(mig.replace(/free_quota_note/g, '')), 'migration never changes status, class, free flag, limits or checks');
  ok(/coalesce\(free_quota_note/.test(mig) && /not like|like '%\[v88\]%'/.test(mig), 'never overwrites founder text; notes added once');
  console.log(`t88: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
