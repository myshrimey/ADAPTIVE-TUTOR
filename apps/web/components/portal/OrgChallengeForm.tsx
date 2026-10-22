'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrgChallengeForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const r = useRouter(); const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  const [f, setF] = useState({ title: '', scope: 'weekly', subjectId: subjects[0]?.id ?? '', size: 8, startsOn: today, endsOn: new Date(Date.now() + 5.5 * 3600000 + 7 * 86400000).toISOString().slice(0, 10) }); const [msg, setMsg] = useState('');
  async function create(e: React.FormEvent) { e.preventDefault(); setMsg('Saving…'); const x = await (await fetch('/api/portal/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })).json(); if (x.error) setMsg(x.error); else { setMsg('Challenge created.'); r.refresh(); } }
  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  return (
    <form onSubmit={create} style={{ display: 'grid', gap: '0.5rem', maxWidth: 420 }}>
      <input className="field__input" placeholder="Challenge title" value={f.title} onChange={(e) => set('title', e.target.value)} required />
      <select className="field__input" value={f.scope} onChange={(e) => set('scope', e.target.value)}><option value="weekly">Weekly challenge</option><option value="class">Class challenge</option><option value="subject">Subject challenge</option><option value="batch">Batch challenge</option></select>
      <select className="field__input" value={f.subjectId} onChange={(e) => set('subjectId', e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <label>Questions <input className="field__input" style={{ width: 80 }} type="number" min={3} max={20} value={f.size} onChange={(e) => set('size', Number(e.target.value))} /></label>
      <label>Starts <input className="field__input" type="date" value={f.startsOn} onChange={(e) => set('startsOn', e.target.value)} /></label>
      <label>Ends <input className="field__input" type="date" value={f.endsOn} onChange={(e) => set('endsOn', e.target.value)} /></label>
      <button className="btn btn--accent" type="submit">Create challenge</button>{msg && <p>{msg}</p>}
    </form>
  );
}
export function CloseChallenge({ id }: { id: string }) { const r = useRouter(); return <button className="btn btn--ghost btn--small" onClick={async () => { await fetch('/api/portal/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', id }) }); r.refresh(); }}>Close</button>; }
