'use client';
import { useState } from 'react';
export function SubjectRequestForm() {
  const [v, setV] = useState({ board: 'CBSE', classLevel: '10', subject: '', language: 'en', note: '' }); const [msg, setMsg] = useState('');
  async function send() { setMsg('Sending…'); const r = await (await fetch('/api/subject-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })).json(); setMsg(r.error ?? 'Thank you. We have noted your request.'); if (!r.error) setV({ ...v, subject: '', note: '' }); }
  return (
    <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
      <h2 style={{ fontSize: 'var(--step-1)', margin: 0 }}>Need a subject we do not have yet?</h2>
      <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Tell us. We count requests to decide what to build next. This is a request, not a promise.</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input className="field__input" style={{ width: 90 }} aria-label="Board" value={v.board} onChange={(e) => setV({ ...v, board: e.target.value })} />
        <input className="field__input" style={{ width: 70 }} aria-label="Class" value={v.classLevel} onChange={(e) => setV({ ...v, classLevel: e.target.value })} />
        <input className="field__input" style={{ flex: 1, minWidth: 180 }} placeholder="Subject" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />
        <select className="field__input" aria-label="Language" value={v.language} onChange={(e) => setV({ ...v, language: e.target.value })}><option value="en">English</option><option value="hi">Hindi</option></select>
        <button className="btn btn--ghost btn--small" onClick={send}>Send request</button>
      </div>
      <p style={{ fontSize: '0.88rem', margin: '0.3rem 0 0' }}>{msg}</p>
    </section>
  );
}
