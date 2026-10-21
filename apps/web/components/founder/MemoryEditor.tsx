'use client';
import { useState } from 'react';
export function MemoryEditor({ sections }: { sections: { section: string; title: string; body: string }[] }) {
  const [vals, setVals] = useState(Object.fromEntries(sections.map((s) => [s.section, s.body]))); const [msg, setMsg] = useState<Record<string, string>>({});
  async function save(section: string) { const r = await fetch('/api/admin/founder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'memory_set', section, body: vals[section] }) }).then((x) => x.json()).catch(() => ({ error: 'network' })); setMsg({ ...msg, [section]: r.error ? 'Not saved' : 'Saved' }); }
  return (<div>{sections.map((s) => (<div key={s.section} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
    <strong>{s.title}</strong><textarea className="field__input" rows={4} value={vals[s.section]} onChange={(e) => setVals({ ...vals, [s.section]: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
    <button className="btn btn--ghost btn--small" onClick={() => save(s.section)}>Save</button> <span style={{ fontSize: '0.85rem' }}>{msg[s.section]}</span></div>))}</div>);
}
