'use client';
import { useState } from 'react';

export function AdminDiagnosticEngine({ initial }: { initial: any }) {
  const [s, setS] = useState({ ...initial });
  const [msg, setMsg] = useState<string | null>(null);
  const num = (k: string, label: string, step = 1) => <label style={{ display: 'block', marginBottom: '0.5rem' }}>{label}<br /><input type="number" step={step} value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} style={{ padding: '0.4rem', width: 140 }} /></label>;
  async function save() { const r = await fetch('/api/admin/diagnostic-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: s }) }); const j = await r.json(); if (j.error) setMsg(j.error); else { setS(j.data); setMsg('Saved.'); } }
  return <div>
    {num('minQuestions', 'Minimum questions before it may stop')}
    {num('recommendedMin', 'Recommended length: from')}
    {num('recommendedMax', 'Recommended length: up to (after this it stops if mostly settled)')}
    {num('maxQuestions', 'Maximum questions in one session (safety limit)')}
    {num('confidenceThreshold', 'Share of target topics that must be settled before stopping (0.5 to 0.98)', 0.05)}
    {num('prereqDepth', 'How many prerequisite steps down it will look for one gap')}
    <label style={{ display: 'block' }}><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> Adaptive check switched on</label>
    <label style={{ display: 'block', marginBottom: '0.6rem' }}><input type="checkbox" checked={s.allowUnreviewed} onChange={(e) => setS({ ...s, allowUnreviewed: e.target.checked })} /> Allow questions that a person has not reviewed yet (needed today: almost all are still &quot;needs review&quot;)</label>
    <button className="btn btn--accent" onClick={save}>Save settings</button> {msg && <span role="status">{msg}</span>}
  </div>;
}
