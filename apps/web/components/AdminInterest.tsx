'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminInterest({ rows }: { rows: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  async function set(id: string, status: string) {
    setBusy(id);
    await fetch('/api/admin/commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'interest_status', id, status }) });
    setBusy(''); router.refresh();
  }
  return (
    <div>
      {rows.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
          <strong>{r.kind}</strong> · {r.name ?? '—'}{r.organisation ? ` (${r.organisation})` : ''} · {r.contact ?? '—'}{r.students ? ` · ${r.students} students` : ''}
          <div style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>{new Date(r.created_at).toLocaleString('en-IN')} · status: <strong>{r.status}</strong></div>
          {r.detail && <div style={{ fontSize: '0.92rem' }}>{r.detail}</div>}
          <select value={r.status} disabled={busy === r.id} onChange={(e) => set(r.id, e.target.value)}>
            {['new', 'contacted', 'in_talks', 'done', 'not_a_fit'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
