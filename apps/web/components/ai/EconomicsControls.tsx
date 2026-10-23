'use client';
import { useState } from 'react';
import { simulateSwitch, type SwitchInput } from '@adaptive-tutor/core';

async function post(body: any): Promise<{ data: any; error: string | null }> {
  try { const r = await fetch('/api/admin/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return await r.json(); } catch { return { data: null, error: 'Network problem. Try again.' }; }
}
const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label style={{ display: 'block', fontSize: '0.85rem', margin: '0.4rem 0' }}>{t}<br />{children}</label>;
const inr = (n: number | null | undefined) => (n === null || n === undefined ? 'Insufficient data' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

/** The founder's economics assumptions (setting ai_economics). Saved to the database, validated on the server. */
export function EconomicsSettings({ econ, tasks }: { econ: any; tasks: { key: string; label: string }[] }) {
  const [v, setV] = useState<any>(() => ({ ...econ, quality_min: { ...econ.quality_min }, max_cost_per_call_inr: { ...econ.max_cost_per_call_inr }, max_latency_ms: { ...econ.max_latency_ms } }));
  const [msg, setMsg] = useState('');
  const set = (k: string, x: any) => setV((o: any) => ({ ...o, [k]: x }));
  const setTask = (map: string, t: string, x: string) => setV((o: any) => ({ ...o, [map]: { ...o[map], [t]: x } }));
  async function save() { setMsg('Saving…'); const r = await post({ action: 'economics_set', economics: v }); setMsg(r.error ? `⚠ ${r.error}` : 'Saved.'); if (!r.error) setTimeout(() => location.reload(), 900); }
  const num = (k: string, label: string, ph = 'empty = not entered') => <L t={label} key={k}><input className="field__input" inputMode="decimal" style={{ width: '100%' }} value={v[k] ?? ''} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></L>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 1rem' }}>
        {num('fx_usd_inr', 'US$ to ₹ rate used for list prices')}
        <L t="Spend limits count which cost?"><select className="field__input" value={v.cap_basis} onChange={(e) => set('cap_basis', e.target.value)}><option value="billed">Billed (what you actually pay; free-quota use is not counted)</option><option value="economic">Economic (list price: free-quota use counts too)</option></select></L>
        <L t="How should Sahayak order models?"><select className="field__input" value={v.route_objective} onChange={(e) => set('route_objective', e.target.value)}><option value="configured_order">Your configured order (primary, fallback, priority)</option><option value="lowest_cost_meeting_quality">Lowest list cost among models that meet every requirement</option></select></L>
        {num('spend_warn_pct', 'Warn at (% of a limit)')}{num('spend_critical_pct', 'Critical at (% of a limit)')}
        {num('handwritten_target_price_inr', 'Handwritten evaluation target price (₹)')}{num('handwritten_min_margin_pct', 'Minimum contribution margin (%) before MARGIN_AT_RISK')}
        {num('handwritten_min_contribution_inr', 'OR a fixed minimum contribution (₹) — overrides the % when set')}
        {num('storage_cost_per_image_inr', 'Storage cost per answer image (₹)')}{num('processing_cost_per_eval_inr', 'Processing cost per evaluation (₹) — if empty, the infrastructure figure from Pricing → economics is used')}
      </div>
      <h4 style={{ margin: '0.8rem 0 0.2rem' }}>Per-task routing requirements (leave empty for no rule)</h4>
      <div style={{ overflowX: 'auto' }}><table style={{ fontSize: '0.85rem', borderCollapse: 'collapse' }}><thead><tr style={{ textAlign: 'left' }}><th style={{ padding: '0.2rem 0.5rem' }}>Task</th><th>Minimum quality (0-100)</th><th>Max cost per call (₹)</th><th>Max average latency (ms)</th></tr></thead><tbody>
        {tasks.map((t) => <tr key={t.key}><td style={{ padding: '0.2rem 0.5rem' }}>{t.label}</td>
          {(['quality_min', 'max_cost_per_call_inr', 'max_latency_ms'] as const).map((m) => <td key={m} style={{ padding: '0.1rem 0.3rem' }}><input className="field__input" inputMode="decimal" style={{ width: 110 }} value={v[m]?.[t.key] ?? ''} onChange={(e) => setTask(m, t.key, e.target.value)} /></td>)}</tr>)}
      </tbody></table></div>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>A quality minimum removes every model that has no benchmark score yet (it is never guessed), so run the benchmark first. A cost limit uses list price, so a free quota does not hide it.</p>
      <button className="btn btn--accent btn--small" onClick={save}>Save assumptions</button> <span style={{ fontSize: '0.88rem' }}>{msg}</span>
    </div>
  );
}

/** Enter what the provider's invoice says for a month, so the app can compare it with its own billed figure. */
export function ReconcileForm({ providers }: { providers: { id: string; name: string }[] }) {
  const [p, setP] = useState(providers[0]?.id ?? ''); const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); const [amt, setAmt] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState('');
  async function save() { const r = await post({ action: 'reconcile_save', providerId: p, period, actualInr: amt, note }); setMsg(r.error ? `⚠ ${r.error}` : 'Saved.'); if (!r.error) setTimeout(() => location.reload(), 900); }
  return (
    <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <select className="field__input" value={p} onChange={(e) => setP(e.target.value)}>{providers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <input className="field__input" style={{ width: 100 }} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-10" />
      <input className="field__input" style={{ width: 140 }} inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Invoice amount ₹" />
      <input className="field__input" style={{ width: 200 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
      <button className="btn btn--ghost btn--small" onClick={save}>Save invoice figure</button> <span style={{ fontSize: '0.85rem' }}>{msg}</span>
    </p>
  );
}

/** ADMIN ONLY calculator: re-prices this month's recorded usage of the current model at an alternative model's registry prices. */
export function SwitchSimulator({ options, fx, daysElapsed, daysInMonth }: { options: any[]; fx: number; daysElapsed: number; daysInMonth: number }) {
  const [cur, setCur] = useState(options[0]?.id ?? ''); const [alt, setAlt] = useState(options[1]?.id ?? options[0]?.id ?? '');
  const c = options.find((o) => o.id === cur), a = options.find((o) => o.id === alt);
  const r = c && a ? simulateSwitch({ current: c.row, alternative: a.row, fx, usage: c.usage, currentQuality: c.quality, altQuality: a.quality, altLatencyMs: a.latencyMs, daysElapsed, daysInMonth } as SwitchInput) : null;
  const sel = (val: string, on: (v: string) => void) => <select className="field__input" value={val} onChange={(e) => on(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>;
  return (
    <div>
      <p style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>Current: {sel(cur, setCur)} vs alternative: {sel(alt, setAlt)}</p>
      {r && (
        <table style={{ fontSize: '0.88rem', borderCollapse: 'collapse' }}><tbody>
          <tr><td style={{ padding: '0.2rem 0.6rem' }}>Current usage this month</td><td>{r.currentMonthToDate.calls} calls · {c.usage.inputTokens.toLocaleString('en-IN')} in / {c.usage.outputTokens.toLocaleString('en-IN')} out tokens · {c.usage.images} images</td></tr>
          <tr><td style={{ padding: '0.2rem 0.6rem' }}>Current cost (list price, month so far → full month)</td><td>{inr(r.currentMonthToDate.economicInr)} → {inr(r.currentFullMonthInr)} <span style={{ color: 'var(--slate)' }}>(billed so far {inr(r.currentMonthToDate.billedInr)})</span></td></tr>
          <tr><td style={{ padding: '0.2rem 0.6rem' }}>Projected alternative cost (list price)</td><td>{r.alternativeMonthToDateInr === null ? 'Insufficient data (no price recorded)' : `${inr(r.alternativeMonthToDateInr)} → ${inr(r.alternativeFullMonthInr)}`}</td></tr>
          <tr><td style={{ padding: '0.2rem 0.6rem' }}>Estimated saving per month</td><td><strong>{r.savingsMonthInr === null ? 'Insufficient data' : `${inr(r.savingsMonthInr)}${r.savingsPct === null ? '' : ` (${r.savingsPct.toFixed(0)}%)`}`}</strong></td></tr>
          <tr><td style={{ padding: '0.2rem 0.6rem' }}>Quality score difference</td><td>{r.qualityDiff === null ? 'Unknown (benchmark both)' : `${r.qualityDiff > 0 ? '+' : ''}${r.qualityDiff.toFixed(1)} (${a.quality} vs ${c.quality})`}</td></tr>
          <tr><td style={{ padding: '0.2rem 0.6rem' }}>Latency difference</td><td>{r.latencyDiffMs === null ? 'Unknown (not enough measured calls)' : `${r.latencyDiffMs > 0 ? '+' : ''}${r.latencyDiffMs} ms`}</td></tr>
        </tbody></table>
      )}
      {r && r.notes.length > 0 && <ul style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>This only calculates. It never changes routing. A cheaper model that scores lower on quality is a decision for you.</p>
    </div>
  );
}
