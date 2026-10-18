'use client';

import { useState } from 'react';

export interface PartnerRow { userId: string; role: string; displayName: string; email: string; city: string | null; details: string; status: string; students: number; created: string }

export function AdminPartners({ rows }: { rows: PartnerRow[] }) {
  const [msg, setMsg] = useState<Record<string, string>>({});
  async function act(id: string, action: 'approve' | 'suspend') {
    const r = await fetch(`/api/admin/partners/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await r.json();
    setMsg((m) => ({ ...m, [id]: j.error ? j.error : `Now ${j.data.status}. Refresh to update the list.` }));
  }
  return (
    <div>
      {rows.length === 0 && <p style={{ color: 'var(--slate)' }}>No parent, tutor or centre accounts yet.</p>}
      {rows.map((p) => (
        <div key={p.userId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <strong>{p.displayName}</strong> <span style={{ color: 'var(--slate)' }}>{p.role} · {p.email}</span> · <strong>{p.status}</strong>
          <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{[p.city, p.details].filter(Boolean).join(' · ') || 'No details given'} · students linked: {p.students} · joined {p.created}</div>
          <div className="hero__actions" style={{ marginTop: '0.4rem' }}>
            {p.status !== 'active' && <button className="btn btn--accent btn--small" onClick={() => act(p.userId, 'approve')}>Approve</button>}
            {p.status === 'active' && <button className="btn btn--ghost btn--small" onClick={() => act(p.userId, 'suspend')}>Suspend</button>}
          </div>
          {msg[p.userId] && <p style={{ fontSize: '0.9rem' }}>{msg[p.userId]}</p>}
        </div>
      ))}
    </div>
  );
}
