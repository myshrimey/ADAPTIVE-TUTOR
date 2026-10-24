'use client';
import { useState } from 'react';

export function AdminChallengeTier({ initial, subjects, styles }: { initial: any; subjects: { id: string; name: string }[]; styles: { id: string; label: string }[] }) {
  const [s, setS] = useState({ ...initial });
  const [msg, setMsg] = useState<string | null>(null);
  const [fill, setFill] = useState({ subjectId: subjects[0]?.id ?? '', style: '', count: 5 });
  const [busy, setBusy] = useState(false);
  const num = (k: string, label: string) => <label style={{ display: 'block', marginBottom: '0.5rem' }}>{label}<br /><input type="number" value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} style={{ padding: '0.4rem', width: 140 }} /></label>;
  async function call(body: any) { const r = await fetch('/api/admin/challenge-tier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
  async function save() { const j = await call({ action: 'save', settings: s }); if (j.error) setMsg(j.error); else { setS(j.data); setMsg('Saved.'); } }
  async function doFill() { setBusy(true); setMsg('Writing questions… this can take up to a minute.'); const j = await call({ action: 'fill', ...fill }); setBusy(false); setMsg(j.error ? j.error : `Wrote ${j.data.made} question(s); ${j.data.failed} attempt(s) failed the checks. They are waiting for a teacher at the question register.`); }
  return <div>
    <label style={{ display: 'block' }}><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> Challenge zone switched on</label>
    <label style={{ display: 'block', marginBottom: '0.6rem' }}><input type="checkbox" checked={s.allowUnreviewed} onChange={(e) => setS({ ...s, allowUnreviewed: e.target.checked })} /> Show questions a teacher has not checked yet (students are told they are unchecked)</label>
    {num('unlockScore', 'Mastery score (50-100) a topic needs before it opens')}
    {num('levelUpAfter', 'Correct in a row to move up a level')}
    {num('levelDownAfter', 'Wrong in a row to step down a level')}
    {num('dailyLimit', 'Challenge questions per student per day (limit)')}
    <button className="btn btn--accent" onClick={save}>Save settings</button>
    <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Write Challenge questions with AI</h2>
    <p style={{ color: 'var(--slate)' }}>Uses the free AI route and the second independent solve. Everything stays &quot;needs review&quot;. Speed depends on the free quota.</p>
    <label>Subject <select value={fill.subjectId} onChange={(e) => setFill({ ...fill, subjectId: e.target.value })}>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{' '}
    <label>Style <select value={fill.style} onChange={(e) => setFill({ ...fill, style: e.target.value })}><option value="">Mixed</option>{styles.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>{' '}
    <label>How many <input type="number" min={1} max={30} value={fill.count} onChange={(e) => setFill({ ...fill, count: Number(e.target.value) })} style={{ width: 70, padding: '0.3rem' }} /></label>{' '}
    <button className="btn btn--ghost" disabled={busy} onClick={doFill}>Write questions</button>
    {msg && <p role="status">{msg}</p>}
  </div>;
}
