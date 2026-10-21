'use client';

import { useState } from 'react';

export interface TranslationRow { subjectId: string; name: string; total: number; translated: number }

export function AdminTranslations({ rows }: { rows: TranslationRow[] }) {
  const [state, setState] = useState<Record<string, { busy: boolean; msg?: string; translated: number }>>(Object.fromEntries(rows.map((r) => [r.subjectId, { busy: false, translated: r.translated }])));
  async function run(id: string) {
    setState((s) => ({ ...s, [id]: { ...s[id], busy: true, msg: undefined } }));
    try {
      const r = await fetch('/api/admin/translations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: id, limit: 18 }) });
      const j = await r.json();
      if (j.error) setState((s) => ({ ...s, [id]: { ...s[id], busy: false, msg: j.error } }));
      else setState((s) => ({ ...s, [id]: { busy: false, translated: s[id].translated + j.data.saved, msg: `Added ${j.data.saved}. About ${j.data.remaining} still to do.${j.data.saved === 0 ? ' Nothing saved: the AI may be busy or returned text that failed the number check. Try again later.' : ''}` } }));
    } catch { setState((s) => ({ ...s, [id]: { ...s[id], busy: false, msg: 'Request failed or timed out. Try again.' } })); }
  }
  return (
    <div>
      {rows.map((r) => (
        <div key={r.subjectId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <strong>{r.name}</strong> · Hindi ready for {state[r.subjectId].translated} of {r.total} questions
          <div className="progress-bar" aria-hidden="true"><div className="progress-bar__fill" style={{ width: `${r.total ? (state[r.subjectId].translated / r.total) * 100 : 0}%` }} /></div>
          <button className="btn btn--accent btn--small" disabled={state[r.subjectId].busy} onClick={() => run(r.subjectId)}>{state[r.subjectId].busy ? 'Translating (up to a minute)…' : 'Translate the next 18'}</button>
          {state[r.subjectId].msg && <p style={{ fontSize: '0.9rem' }}>{state[r.subjectId].msg}</p>}
        </div>
      ))}
    </div>
  );
}
