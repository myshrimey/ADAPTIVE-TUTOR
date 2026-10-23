import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { loadGatewayConfig, validateGatewayConfig, loadProviders, activationBlocker, buildAdapter, runBenchmark, qualityScore, validateEconomics, loadEconomics, MANUAL_DIMENSIONS, VERIFY_CHECKS, ADAPTERS, KEY_ENV_RE, computeCost, type ProviderRow } from '@adaptive-tutor/core';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ADMIN ONLY. Every write for Admin -> AI Infrastructure. API keys are never accepted, stored or returned: a provider row holds only the NAME of a server environment variable.
class Bad extends Error {}
const bad = (m: string) => new Bad(m);
const int = (v: any, name: string, min = 0, max = 1_000_000_000): number | null => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); if (!Number.isInteger(n) || n < min || n > max) throw bad(`${name} must be a whole number ${min}-${max} or empty.`); return n; };
const num = (v: any, name: string): number | null => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 100000) throw bad(`${name} must be a positive number or empty.`); return n; };
const txt = (v: any, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const tri = (v: any): boolean | null => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null);
const date = (v: any, name: string): string | null => { if (v === '' || v === null || v === undefined) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v)) || Number.isNaN(Date.parse(String(v)))) throw bad(`${name} must be a date.`); return String(v); };
const oneOf = (v: any, list: readonly string[], name: string): string => { if (!list.includes(String(v))) throw bad(`${name} is not valid.`); return String(v); };

function cleanProvider(v: Record<string, any>, partial: boolean): Record<string, unknown> {
  const o: Record<string, unknown> = {}; const has = (k: string) => k in v;
  if (has('provider_name')) { const n = txt(v.provider_name, 120); if (!n) throw bad('A provider name is required.'); o.provider_name = n; }
  if (has('adapter')) o.adapter = oneOf(v.adapter, ADAPTERS, 'adapter');
  for (const k of ['region', 'model', 'model_version', 'free_quota_note', 'languages', 'data_policy', 'verification_required', 'notes'] as const) if (has(k)) o[k] = txt(v[k], k === 'model' || k === 'model_version' || k === 'region' ? 120 : 800);
  if (has('endpoint')) { const e = txt(v.endpoint, 400); if (e && !/^https:\/\/[^\s]+$/.test(e)) throw bad('The endpoint must start with https://'); o.endpoint = e; }
  if (has('source_url')) { const e = txt(v.source_url, 400); if (e && !/^https:\/\/[^\s]+$/.test(e)) throw bad('The documentation URL must start with https://'); o.source_url = e; }
  if (has('key_env')) { const k = txt(v.key_env, 60); if (k && !KEY_ENV_RE.test(k)) throw bad('The key name must be CAPITAL_LETTERS_AND_UNDERSCORES (the NAME of the server variable, never the key itself).'); o.key_env = k; }
  if (has('priority')) o.priority = int(v.priority, 'priority', 0, 10000) ?? 100;
  if (has('classification')) o.classification = oneOf(v.classification, ['A', 'B', 'C', 'D', 'E', 'F'], 'classification');
  for (const k of ['free_tier_available', 'vision', 'structured_output', 'tool_calling'] as const) if (has(k)) o[k] = tri(v[k]);
  for (const k of ['rpm', 'rpd', 'tpm', 'tpd', 'context_window'] as const) if (has(k)) o[k] = int(v[k], k);
  for (const k of ['input_price_usd_m', 'output_price_usd_m', 'image_price_usd', 'audio_stt_price_usd', 'tts_price_usd'] as const) if (has(k)) o[k] = num(v[k], k);
  if (has('commercial_use')) o.commercial_use = oneOf(v.commercial_use, ['yes', 'no', 'unknown'], 'commercial use');
  if (has('policy_status')) o.policy_status = oneOf(v.policy_status, ['unknown', 'acceptable', 'not_acceptable'], 'policy status');
  if (has('quota_reset')) o.quota_reset = oneOf(v.quota_reset, ['daily', 'monthly', 'none'], 'quota reset');
  if (has('free_tier_expiry')) o.free_tier_expiry = date(v.free_tier_expiry, 'Free-tier expiry');
  if (has('last_verified')) o.last_verified = date(v.last_verified, 'Verified date');
  if (has('verification')) { const ver: Record<string, boolean> = {}; for (const k of VERIFY_CHECKS) ver[k] = v.verification?.[k] === true; o.verification = ver; }
  // v59: exact quota/plan, promotional credit, capabilities, production status. Capabilities left unknown are simply not recorded.
  if (has('quota_type')) o.quota_type = oneOf(v.quota_type, ['unknown', 'free_quota', 'promo_credit', 'paid'], 'quota type');
  if (has('production_status')) o.production_status = oneOf(v.production_status, ['unknown', 'test_only', 'pilot', 'production'], 'production status');
  if (has('quota_region')) o.quota_region = txt(v.quota_region, 120);
  if (has('promo_credit_balance_inr')) { o.promo_credit_balance_inr = num(v.promo_credit_balance_inr, 'Promotional credit'); }
  if (has('promo_credit_expiry')) o.promo_credit_expiry = date(v.promo_credit_expiry, 'Promotional credit expiry');
  if (has('price_last_verified')) o.price_last_verified = date(v.price_last_verified, 'Price verified date');
  if (has('cap_hindi') || has('cap_ocr') || has('cap_json')) {
    const caps: Record<string, boolean> = {};
    for (const [k, key] of [['cap_hindi', 'hindi'], ['cap_ocr', 'ocr'], ['cap_json', 'json']] as const) { const t = tri(v[k]); if (t !== null) caps[key] = t; }
    if (tri(v.vision) !== null) caps.vision = tri(v.vision) as boolean;
    o.capabilities = caps;
  }
  if (!partial && !o.provider_name) throw bad('A provider name is required.');
  return o;
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const b = await req.json();
    const s = createServiceClient();
    const action = String(b.action ?? '');

    if (action === 'config_set') {
      const cur = await loadGatewayConfig(s);
      const r = validateGatewayConfig(b.config ?? {}, cur);
      if (!r.ok) throw bad(r.error);
      const providers = await loadProviders(s); const known = new Set(providers.map((p) => p.id));
      for (const id of [r.value.primary_provider, r.value.fallback_provider, ...Object.values(r.value.routes).flat()]) if (id && !known.has(id)) throw bad(`"${id}" is not in the provider list.`);
      const { error } = await s.from('commerce_settings').upsert({ key: 'ai_gateway', value: r.value, note: 'AI gateway controls (edited at /admin/ai-infrastructure)', updated_at: new Date().toISOString() } as any, { onConflict: 'key' });
      if (error) throw bad('Could not save (has migration 0032 been run?).');
      return NextResponse.json({ data: { config: r.value }, error: null });
    }

    if (action === 'provider_save') {
      const id = String(b.id ?? '');
      if (!/^[a-z][a-z0-9_]{1,39}$/.test(id)) throw bad('The provider id must be lower-case letters, numbers and underscores.');
      const { data: ex } = await s.from('ai_providers').select('*').eq('id', id).maybeSingle();
      const values = cleanProvider(b.values ?? {}, !!ex);
      // The credit balance is "as of" the moment it was entered; keep the old moment when the number did not change.
      if ('promo_credit_balance_inr' in values && Number((ex as any)?.promo_credit_balance_inr ?? NaN) !== Number(values.promo_credit_balance_inr ?? NaN)) values.promo_credit_as_of = new Date().toISOString();
      if (!ex) {
        if (!values.adapter) values.adapter = 'openai_compatible';
        // A new provider always starts as an unapproved candidate; it can only become active through provider_status.
        Object.assign(values, { status: 'candidate', classification: values.classification ?? 'F', legacy: false });
        const { error } = await s.from('ai_providers').insert({ id, ...values }); if (error) throw bad('Could not add the provider.');
      } else {
        const { error } = await s.from('ai_providers').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw bad('Could not save the provider.');
      }
      return NextResponse.json({ data: { id }, error: null });
    }

    if (action === 'provider_status') {
      const id = String(b.id ?? ''); const status = oneOf(b.status, ['candidate', 'testing', 'active', 'paused', 'retired'], 'status');
      const { data: p } = await s.from('ai_providers').select('*').eq('id', id).maybeSingle();
      if (!p) throw bad('Unknown provider.');
      if (status === 'active' || status === 'testing') { const why = activationBlocker(p as ProviderRow); if (why) throw bad(`Cannot switch on yet: ${why}`); }
      const { error } = await s.from('ai_providers').update({ status, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw bad('Could not change the status.');
      return NextResponse.json({ data: { id, status }, error: null });
    }

    if (action === 'provider_test') {
      // One tiny real call straight to this provider (not through routing). Logged like any call, so it counts against quota and cost.
      const id = String(b.id ?? '');
      const { data: p } = await s.from('ai_providers').select('*').eq('id', id).maybeSingle();
      if (!p) throw bad('Unknown provider.');
      const row = p as ProviderRow;
      const secret = row.key_env ? process.env[row.key_env] : undefined;
      const t0 = Date.now(); let ok = true, err: string | null = null, usage = { inputTokens: 0, outputTokens: 0 }, text = '';
      try {
        const adapter = buildAdapter(row);
        const r = await adapter.complete({ systemPrompt: 'Reply with the single word OK.', userMessage: 'Say OK.', feature: 'provider_test' });
        usage = r.usage; text = r.text.slice(0, 40);
      } catch (e: any) { ok = false; err = String(e?.message ?? e).slice(0, 160); if (secret) err = err.split(secret).join('[key]'); }
      const ms = Date.now() - t0; const c = computeCost(row, usage.inputTokens, usage.outputTokens);
      await s.from('ai_usage').insert({ student_id: null, tier: 'free', provider: row.id, feature: 'provider_test', ok, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, latency_ms: ms, error: err, model: row.model, task: 'provider_test', task_tier: 1, cost_est_inr: c.estInr, cost_inr: c.billedInr, free_quota_used: c.freeQuotaUsed });
      if (ok) {
        // The three checks a single call can honestly prove. The other six stay manual.
        const ver = { ...(row.verification ?? {}), api_availability: true, authentication: true, ...(ms < 15000 ? { latency: true } : {}) };
        await s.from('ai_providers').update({ verification: ver, updated_at: new Date().toISOString() }).eq('id', id);
      }
      return NextResponse.json({ data: { ok, latencyMs: ms, error: err, reply: text }, error: null });
    }

    if (action === 'case_save') {
      const v = b.values ?? {}; const prompt = txt(v.prompt, 2000); if (!prompt) throw bad('A question is required.');
      const row = { class_level: txt(v.class_level, 10), subject: txt(v.subject, 60), language: oneOf(v.language ?? 'en', ['en', 'hi'], 'language'), kind: oneOf(v.kind ?? 'short', ['mcq', 'numeric', 'short', 'explain', 'translate'], 'kind'), prompt, expected: txt(v.expected, 500), notes: txt(v.notes, 300), active: v.active !== false };
      const q = b.id ? s.from('ai_benchmark_cases').update(row).eq('id', String(b.id)) : s.from('ai_benchmark_cases').insert(row);
      const { error } = await q; if (error) throw bad('Could not save the case.');
      return NextResponse.json({ data: { ok: true }, error: null });
    }

    if (action === 'economics_set') {
      const cur = await loadEconomics(s);
      const r = validateEconomics(b.economics ?? {}, cur);
      if (!r.ok) throw bad(r.error);
      const { error } = await s.from('commerce_settings').upsert({ key: 'ai_economics', value: r.value, note: 'AI economics assumptions (edited at /admin/ai-economics). Not provider facts.', updated_at: new Date().toISOString() } as any, { onConflict: 'key' });
      if (error) throw bad('Could not save (has migration 0036 been run?).');
      return NextResponse.json({ data: { economics: r.value }, error: null });
    }

    if (action === 'reconcile_save') {
      const providerId = String(b.providerId ?? ''); const period = String(b.period ?? '');
      if (!/^[a-z][a-z0-9_]{1,39}$/.test(providerId)) throw bad('Choose a provider.');
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw bad('Period must look like 2026-10.');
      const n = Number(b.actualInr); if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw bad('Enter the invoice amount in rupees (0 or more).');
      const { error } = await s.from('ai_reconciliations').upsert({ provider_id: providerId, period, actual_inr: n, note: txt(b.note, 300) }, { onConflict: 'provider_id,period' });
      if (error) throw bad('Could not save (has migration 0036 been run? Is the provider id right?).');
      return NextResponse.json({ data: { saved: true }, error: null });
    }

    if (action === 'benchmark_run') {
      const opt = (v: any) => (typeof v === 'string' && /^[A-Za-z0-9 _.-]{1,40}$/.test(v) ? v : undefined);
      const r = await runBenchmark(s, String(b.providerId ?? ''), { cases: 12, subject: opt(b.subject), classLevel: opt(b.classLevel), language: opt(b.language), kind: opt(b.kind) });
      return NextResponse.json({ data: r, error: null });
    }

    if (action === 'benchmark_scores') {
      const runId = String(b.runId ?? ''); const scores: Record<string, number> = {};
      for (const k of MANUAL_DIMENSIONS) { const raw = b.scores?.[k]; if (raw === '' || raw === null || raw === undefined) continue; const n = Number(raw); if (!Number.isInteger(n) || n < 0 || n > 5) throw bad('Ratings are whole numbers 0-5.'); scores[k] = n; }
      const { data: run } = await s.from('ai_benchmark_runs').select('auto_correct, auto_total').eq('id', runId).maybeSingle();
      if (!run) throw bad('Unknown run.');
      const q = qualityScore(run.auto_correct, run.auto_total, scores);
      const { error } = await s.from('ai_benchmark_runs').update({ scores, quality_score: q, notes: txt(b.notes, 500) }).eq('id', runId); if (error) throw bad('Could not save.');
      return NextResponse.json({ data: { quality: q }, error: null });
    }

    throw bad('Unknown action.');
  } catch (err: any) {
    const m = String(err?.message ?? 'error');
    if (m === 'not_authorized') return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
    return NextResponse.json({ data: null, error: err instanceof Bad || /^(Switch|This provider|No benchmark|Provider|Could not)/.test(m) ? m : 'failed' }, { status: 400 });
  }
}
