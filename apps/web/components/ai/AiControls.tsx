'use client';
import { useState } from 'react';

async function post(body: any): Promise<{ data: any; error: string | null }> {
  try { const r = await fetch('/api/admin/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return await r.json(); } catch { return { data: null, error: 'Network problem. Try again.' }; }
}
const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label style={{ display: 'block', fontSize: '0.85rem', margin: '0.4rem 0' }}>{t}<br />{children}</label>;

/** The founder's global switches. Saved to the database; no code change needed. */
export function GatewayControls({ config, providerIds, tasks }: { config: any; providerIds: string[]; tasks: { key: string; label: string; tier: number }[] }) {
  const [c, setC] = useState<any>({ ...config, routes: { ...(config.routes ?? {}) } });
  const [msg, setMsg] = useState('');
  const set = (k: string, v: any) => setC((x: any) => ({ ...x, [k]: v }));
  const numField = (k: string, label: string, hint?: string) => (
    <L t={label}><input className="field__input" inputMode="decimal" style={{ width: 130 }} value={c[k] ?? ''} placeholder="no limit" onChange={(e) => set(k, e.target.value)} />{hint && <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}> {hint}</span>}</L>
  );
  async function save() {
    setMsg('Saving…');
    const r = await post({ action: 'config_set', config: c });
    setMsg(r.error ? `Not saved: ${r.error}` : 'Saved. Takes effect within about 20 seconds.');
  }
  const sel = (k: string, label: string) => (
    <L t={label}><select className="field__input" value={c[k] ?? ''} onChange={(e) => set(k, e.target.value || null)}><option value="">(none)</option>{providerIds.map((p) => <option key={p} value={p}>{p}</option>)}</select></L>
  );
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>{sel('primary_provider', 'PRIMARY_PROVIDER')}<L t="PRIMARY_MODEL (blank = the model in the provider list)"><input className="field__input" value={c.primary_model ?? ''} onChange={(e) => set('primary_model', e.target.value)} /></L></div>
        <div>{sel('fallback_provider', 'FALLBACK_PROVIDER')}<L t="FALLBACK_MODEL (blank = the model in the provider list)"><input className="field__input" value={c.fallback_model ?? ''} onChange={(e) => set('fallback_model', e.target.value)} /></L></div>
      </div>
      <L t=""><label><input type="checkbox" checked={!!c.free_only_mode} onChange={(e) => set('free_only_mode', e.target.checked)} /> <strong>FREE_ONLY_MODE</strong>: never use a provider that bills per use (recommended until revenue)</label></L>
      <L t=""><label><input type="checkbox" checked={!!c.allow_paid_fallback} onChange={(e) => set('allow_paid_fallback', e.target.checked)} /> Allow paid providers as backup for PAID students (needs Free-only OFF and BOTH daily and monthly limits below)</label></L>
      <L t=""><label><input type="checkbox" checked={!!c.block_unknown_policy} onChange={(e) => set('block_unknown_policy', e.target.checked)} /> Send student text only to providers whose data policy is marked &ldquo;acceptable&rdquo;</label></L>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem' }}>
        {numField('max_daily_spend_inr', 'MAX_DAILY_SPEND (₹)')}{numField('max_monthly_spend_inr', 'MAX_MONTHLY_SPEND (₹)')}{numField('max_cost_per_user_inr', 'Max cost per student per month (₹)')}
        {numField('max_cost_per_feature_inr', 'Max cost per feature per month (₹)')}{numField('max_handwritten_eval_inr', 'Max cost of one handwritten evaluation (₹)')}{numField('max_calls_per_user_day', 'Max AI calls per student per day')}
        {numField('quota_warn_pct', 'Quota warning at (%)')}{numField('quota_critical_pct', 'Quota critical at (%)')}{numField('handwriting_min_quality', 'Handwriting: minimum benchmark score (0-100)', 'blank = no gate')}
      </div>
      <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Fallback order per task (optional)</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: 0 }}>Comma-separated provider ids, first is tried first. Blank = primary, then fallback, then the rest by priority.</p>
      {tasks.map((t) => (
        <div key={t.key} className="chapter-row" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ width: 260 }}>{t.label} <small style={{ color: 'var(--slate)' }}>(tier {t.tier})</small></span>
          <input className="field__input" style={{ flex: 1 }} placeholder="e.g. gemini, groq, deepseek" value={(c.routes?.[t.key] ?? []).join(', ')} onChange={(e) => setC((x: any) => ({ ...x, routes: { ...x.routes, [t.key]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }))} />
        </div>
      ))}
      <p style={{ marginTop: '0.8rem' }}><button className="btn btn--accent" onClick={save}>Save controls</button> <span style={{ fontSize: '0.9rem' }}>{msg}</span></p>
    </div>
  );
}

const CHECKS: [string, string][] = [['api_availability', 'API availability test'], ['authentication', 'Authentication test'], ['quota', 'Quota test'], ['model_capability', 'Model capability test'], ['latency', 'Latency test'], ['failure_retry', 'Failure / retry test'], ['commercial_terms', 'Commercial-use / terms review'], ['data_policy', 'Data-policy review'], ['cost', 'Cost test']];
const FIELDS: [string, string, 'text' | 'int' | 'num' | 'date' | 'tri' | 'area'][] = [
  ['provider_name', 'Provider name', 'text'], ['region', 'Country / region', 'text'], ['model', 'Model', 'text'], ['model_version', 'Model version', 'text'], ['endpoint', 'API endpoint (full https chat-completions URL)', 'text'],
  ['key_env', 'Server key NAME (e.g. DEEPSEEK_API_KEY). Never paste the key itself', 'text'], ['priority', 'Priority (lower = earlier)', 'int'],
  ['free_tier_available', 'Free tier available?', 'tri'], ['free_quota_note', 'Free quota (as stated by the provider)', 'text'],
  ['rpm', 'Requests / minute', 'int'], ['rpd', 'Requests / day', 'int'], ['tpm', 'Tokens / minute', 'int'], ['tpd', 'Tokens / day', 'int'],
  ['input_price_usd_m', 'Input price (US$ per 1M tokens)', 'num'], ['output_price_usd_m', 'Output price (US$ per 1M tokens)', 'num'], ['image_price_usd', 'Image price (US$ per image)', 'num'], ['audio_stt_price_usd', 'Audio / speech-to-text price', 'num'], ['tts_price_usd', 'Text-to-speech price', 'num'],
  ['context_window', 'Context window (tokens)', 'int'], ['languages', 'Supported languages', 'text'], ['vision', 'Reads images?', 'tri'], ['structured_output', 'Structured output?', 'tri'], ['tool_calling', 'Tool / function calling?', 'tri'],
  ['data_policy', 'Data retention / training policy (as stated)', 'area'], ['verification_required', 'Account verification required', 'text'], ['free_tier_expiry', 'Free-tier expiry', 'date'],
  ['last_verified', 'Last verified date', 'date'], ['source_url', 'Official documentation URL you checked (https://…)', 'text'], ['notes', 'Notes', 'area'],
];
const SELECTS: [string, string, string[]][] = [['classification', 'Classification (A free-suitable, B free-limited, C trial, D paid, E open-weight, F not approved)', ['A', 'B', 'C', 'D', 'E', 'F']], ['commercial_use', 'Commercial use permitted?', ['unknown', 'yes', 'no']], ['policy_status', 'Data policy acceptable for Sahayak?', ['unknown', 'acceptable', 'not_acceptable']], ['quota_reset', 'Quota resets', ['daily', 'monthly', 'none']]];

export function ProviderEditor({ p, blocker }: { p: any; blocker: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<any>(() => ({ ...p, verification: { ...(p.verification ?? {}) } }));
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((x: any) => ({ ...x, [k]: val }));
  async function run(body: any, ok: (d: any) => string) { setBusy(true); setMsg('Working…'); const r = await post(body); setBusy(false); setMsg(r.error ? `⚠ ${r.error}` : ok(r.data)); if (!r.error) setTimeout(() => location.reload(), 1200); }
  const save = () => run({ action: 'provider_save', id: p.id, values: v }, () => 'Saved.');
  const status = (s: string) => run({ action: 'provider_status', id: p.id, status: s }, () => `Status is now ${s}.`);
  async function test() { setBusy(true); setMsg('Testing (one tiny call)…'); const r = await post({ action: 'provider_test', id: p.id }); setBusy(false); setMsg(r.error ? `⚠ ${r.error}` : r.data.ok ? `✓ Connected in ${r.data.latencyMs} ms (API availability, authentication and latency ticked).` : `✗ Failed: ${r.data.error}`); }
  return (
    <div className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>{p.provider_name}</strong> <code style={{ fontSize: '0.8rem' }}>{p.id}</code> <span>{p.model ?? <em>no model set</em>}</span>
        <span style={{ fontSize: '0.8rem' }}>status: <strong>{p.status}</strong> · class {p.classification} · key {p.keySet ? 'set' : 'NOT set'}{p.legacy ? ' · existing' : ''}{p.last_verified ? ` · verified ${p.last_verified}` : ' · NOT VERIFIED'}</span>
        <button className="btn btn--ghost btn--small" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Details / edit'}</button>
      </div>
      {open && (
        <div style={{ marginTop: '0.6rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.2rem 1rem' }}>
            {FIELDS.map(([k, label, kind]) => (
              <L key={k} t={label}>
                {kind === 'tri' ? <select className="field__input" value={v[k] === true ? 'true' : v[k] === false ? 'false' : ''} onChange={(e) => set(k, e.target.value)}><option value="">UNKNOWN — VERIFY</option><option value="true">Yes</option><option value="false">No</option></select>
                  : kind === 'area' ? <textarea className="field__input" rows={2} style={{ width: '100%' }} value={v[k] ?? ''} placeholder="UNKNOWN — VERIFY" onChange={(e) => set(k, e.target.value)} />
                  : <input className="field__input" type={kind === 'date' ? 'date' : 'text'} inputMode={kind === 'int' || kind === 'num' ? 'decimal' : undefined} style={{ width: '100%' }} value={v[k] ?? ''} placeholder={kind === 'date' ? '' : 'UNKNOWN — VERIFY'} onChange={(e) => set(k, e.target.value)} />}
              </L>
            ))}
            {SELECTS.map(([k, label, opts]) => <L key={k} t={label}><select className="field__input" value={v[k]} onChange={(e) => set(k, e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></L>)}
          </div>
          <h4 style={{ margin: '0.6rem 0 0.2rem' }}>Verification checklist (tick only what you have really checked in the CURRENT official documentation)</h4>
          {CHECKS.map(([k, label]) => <label key={k} style={{ display: 'block', fontSize: '0.88rem' }}><input type="checkbox" checked={!!v.verification[k]} onChange={(e) => set('verification', { ...v.verification, [k]: e.target.checked })} /> {label}</label>)}
          <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{blocker ? `Cannot be switched on yet: ${blocker}` : 'Ready to be switched on.'}</p>
          <div className="hero__actions" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--accent btn--small" disabled={busy} onClick={save}>Save details</button>
            <button className="btn btn--ghost btn--small" disabled={busy} onClick={test}>Test connection (1 small call)</button>
            {p.status !== 'testing' && <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => status('testing')}>Set to testing</button>}
            {p.status !== 'active' && <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => status('active')}>Switch ON (active)</button>}
            {p.status === 'active' && <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => status('paused')}>Pause</button>}
            {p.status !== 'retired' && <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => status('retired')}>Retire</button>}
          </div>
        </div>
      )}
      {msg && <p style={{ fontSize: '0.88rem', margin: '0.3rem 0 0' }}>{msg}</p>}
    </div>
  );
}

export function AddProvider() {
  const [id, setId] = useState(''); const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  async function add() { const r = await post({ action: 'provider_save', id, values: { provider_name: name, adapter: 'openai_compatible', key_env: `${id.toUpperCase()}_API_KEY` } }); setMsg(r.error ?? 'Added as a candidate. Open it below to fill in the details.'); if (!r.error) setTimeout(() => location.reload(), 1000); }
  return (<p><input className="field__input" placeholder="id (e.g. newprovider)" value={id} onChange={(e) => setId(e.target.value.toLowerCase())} /> <input className="field__input" placeholder="Provider name" value={name} onChange={(e) => setName(e.target.value)} /> <button className="btn btn--ghost btn--small" onClick={add}>Add a provider</button> <span style={{ fontSize: '0.85rem' }}>{msg}</span></p>);
}

export function BenchmarkPanel({ providers, runs, cases }: { providers: { id: string; name: string }[]; runs: any[]; cases: any[] }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [nc, setNc] = useState<any>({ class_level: '10', subject: '', language: 'en', kind: 'short', prompt: '', expected: '' });
  async function run(id: string) { setBusy(true); setMsg('Running… (up to 12 questions; this can take a minute)'); const r = await post({ action: 'benchmark_run', providerId: id }); setBusy(false); setMsg(r.error ? `⚠ ${r.error}` : `Done: ${r.data.autoCorrect}/${r.data.autoTotal} auto-marked correct, ${r.data.failures} failed.`); if (!r.error) setTimeout(() => location.reload(), 1500); }
  async function addCase() { const r = await post({ action: 'case_save', values: nc }); setMsg(r.error ?? 'Question added.'); if (!r.error) setTimeout(() => location.reload(), 800); }
  return (
    <div>
      <p style={{ fontSize: '0.88rem' }}>{cases.filter((c) => c.active).length} active test question(s). Only providers set to <em>testing</em> or <em>active</em> with a key set can be run.</p>
      <div className="hero__actions" style={{ flexWrap: 'wrap' }}>{providers.map((p) => <button key={p.id} disabled={busy} className="btn btn--ghost btn--small" onClick={() => run(p.id)}>Run on {p.name}</button>)}</div>
      <h4 style={{ margin: '0.8rem 0 0.2rem' }}>Add a test question</h4>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input className="field__input" style={{ width: 70 }} placeholder="Class" value={nc.class_level} onChange={(e) => setNc({ ...nc, class_level: e.target.value })} />
        <input className="field__input" style={{ width: 140 }} placeholder="Subject" value={nc.subject} onChange={(e) => setNc({ ...nc, subject: e.target.value })} />
        <select className="field__input" value={nc.language} onChange={(e) => setNc({ ...nc, language: e.target.value })}><option value="en">English</option><option value="hi">Hindi</option></select>
        <select className="field__input" value={nc.kind} onChange={(e) => setNc({ ...nc, kind: e.target.value })}>{['short', 'numeric', 'mcq', 'explain', 'translate'].map((k) => <option key={k}>{k}</option>)}</select>
        <input className="field__input" style={{ flex: 1, minWidth: 240 }} placeholder="Question" value={nc.prompt} onChange={(e) => setNc({ ...nc, prompt: e.target.value })} />
        <input className="field__input" style={{ width: 160 }} placeholder="Expected answer (auto-marks)" value={nc.expected} onChange={(e) => setNc({ ...nc, expected: e.target.value })} />
        <button className="btn btn--ghost btn--small" onClick={addCase}>Add</button>
      </div>
      <p style={{ fontSize: '0.88rem' }}>{msg}</p>
      <h4 style={{ margin: '0.8rem 0 0.2rem' }}>Results by model, version and date</h4>
      {runs.length === 0 ? <p style={{ color: 'var(--slate)' }}>No runs yet.</p> : runs.map((r) => <RunRow key={r.id} r={r} name={providers.find((p) => p.id === r.provider_id)?.name ?? r.provider_id} />)}
    </div>
  );
}
const DIMS: [string, string][] = [['factual', 'Factual accuracy'], ['reasoning', 'Reasoning'], ['cbse_alignment', 'CBSE alignment'], ['explanation', 'Explanation quality'], ['marking_scheme', 'Marking scheme'], ['multilingual', 'Multilingual'], ['hallucination', 'No hallucination'], ['safety', 'Safety']];
function RunRow({ r, name }: { r: any; name: string }) {
  const [s, setS] = useState<any>(r.scores ?? {}); const [msg, setMsg] = useState('');
  async function save() { const x = await post({ action: 'benchmark_scores', runId: r.id, scores: s }); setMsg(x.error ?? `Saved. Quality score ${x.data.quality ?? '—'}`); }
  return (
    <div className="chapter-row" style={{ display: 'block' }}>
      <strong>{name}</strong> · {r.model ?? '—'} · {new Date(r.run_at).toLocaleString('en-IN')} · auto-marked {r.auto_correct}/{r.auto_total} · failed {r.failures} · avg {r.latency_ms_avg ?? '—'} ms · cost ₹{Number(r.cost_inr).toFixed(2)} · <strong>quality {r.quality_score ?? 'not enough data'}</strong>
      <details><summary style={{ cursor: 'pointer', fontSize: '0.85rem' }}>Add your 0-5 ratings (a person must judge these)</summary>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>{DIMS.map(([k, l]) => <label key={k} style={{ fontSize: '0.8rem' }}>{l}<br /><input className="field__input" style={{ width: 60 }} inputMode="numeric" value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>)}</div>
        <button className="btn btn--ghost btn--small" onClick={save}>Save ratings</button> <span style={{ fontSize: '0.85rem' }}>{msg}</span></details>
    </div>
  );
}
