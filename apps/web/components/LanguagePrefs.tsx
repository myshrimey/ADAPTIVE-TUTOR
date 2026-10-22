'use client';
import { useEffect, useState } from 'react';

type Opt = { code: string; label: string; native_label: string };
// Four independent choices. "Not set" keeps today's behaviour: questions and reports follow the app language, the tutor replies in English.
export function LanguagePrefs() {
  const [d, setD] = useState<any>(null); const [vals, setVals] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/student/language').then((r) => r.json()).then((j) => { if (j.data) { setD(j.data); setVals({ app: j.data.prefs.app ?? '', question: j.data.prefs.question ?? '', learning: j.data.prefs.learning ?? '', report: j.data.prefs.report ?? '' }); } }); }, []);
  if (!d) return null;
  const notSet: Record<string, string> = { app: 'Not set (follows this device)', question: 'Not set (follows the app language)', learning: 'Not set (English)', report: 'Not set (follows the app language)' };
  async function save() {
    setMsg('Saving…');
    const r = await (await fetch('/api/student/language', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) })).json();
    setMsg(r.error ? `Not saved: ${r.error}` : 'Saved.');
    if (!r.error) { const j = await (await fetch('/api/student/language')).json(); if (j.data) setD(j.data); }
  }
  return (
    <section className="chapter-row" style={{ display: 'block', margin: 'var(--space-3) 0' }}>
      <h2 style={{ fontSize: 'var(--step-1)', margin: 0 }}>Languages</h2>
      <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Each one is chosen separately. For example: app in English, questions in Hindi, tutor explanations in Hindi, reports in English.</p>
      {d.kinds.map((k: any) => (
        <label key={k.kind} style={{ display: 'block', margin: '0.5rem 0' }}><strong>{k.label}</strong> <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{k.help}</span><br />
          <select className="field__input" value={vals[k.kind] ?? ''} onChange={(e) => setVals({ ...vals, [k.kind]: e.target.value })}>
            <option value="">{notSet[k.kind]}</option>
            {d.languages.map((l: Opt) => <option key={l.code} value={l.code}>{l.label} ({l.native_label})</option>)}
          </select>
          <span style={{ fontSize: '0.82rem', color: 'var(--slate)' }}> now using: {d.effective[k.kind]}</span>
        </label>
      ))}
      {d.conflicts.map((c: any, i: number) => <p key={i} className="alert">{c.message}</p>)}
      <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Hindi questions exist for mock tests only, and are AI-translated and checked automatically; a teacher check is still in progress. A question without a usable Hindi version is shown in English and says so. Tutor and feedback in Hindi are written by AI and may contain mistakes: tell us if you see one.</p>
      <button className="btn btn--accent btn--small" onClick={save}>Save language choices</button> <span style={{ fontSize: '0.9rem' }}>{msg}</span>
    </section>
  );
}
