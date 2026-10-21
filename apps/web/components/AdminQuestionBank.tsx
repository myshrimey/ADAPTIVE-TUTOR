'use client';
import { useState } from 'react';

export type BankRow = { subjectId: string; name: string; practice: number; diagnostic: number; needsReview: number; owed: number; produced: number; rejected: number; lastRun: string | null };

export function AdminQuestionBank({ rows }: { rows: BankRow[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  async function go(id: string, add: number) {
    setBusy(id);
    try {
      const r = await fetch('/api/admin/question-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: id, add }) });
      const j = await r.json();
      setMsg({ ...msg, [id]: j.error ? `Problem: ${j.error}` : j.data.skipped === 'locked' ? 'A run is already going. Try again in a minute.' : j.data.skipped === 'nothing_owed' ? 'Nothing is owed. Use "Add 50 and write".' : `Wrote ${j.data.made} new questions. Still owed: ${j.data.stillOwed}. Reload to see totals.` });
    } catch { setMsg({ ...msg, [id]: 'Could not reach the server.' }); }
    setBusy(null);
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
        <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Subject</th><th>Practice</th><th>Diagnostic</th><th>AI-written, unreviewed</th><th>Owed</th><th>Written / dropped by check</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subjectId} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
              <td style={{ padding: '0.5rem 0.4rem' }}>{r.name}</td><td>{r.practice}</td><td>{r.diagnostic}</td><td>{r.needsReview}</td><td>{r.owed}</td><td>{r.produced} / {r.rejected}</td>
              <td>
                <button className="btn btn--small" disabled={busy === r.subjectId} onClick={() => go(r.subjectId, 0)}>{busy === r.subjectId ? 'Working (up to 45 s)…' : 'Write what is owed'}</button>{' '}
                <button className="btn btn--ghost btn--small" disabled={busy === r.subjectId} onClick={() => go(r.subjectId, 50)}>Add 50 and write</button>
                {msg[r.subjectId] && <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{msg[r.subjectId]}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
