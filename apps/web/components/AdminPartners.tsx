'use client';

import { useState } from 'react';

export interface PartnerRow { userId: string; role: string; displayName: string; email: string; city: string | null; details: string; status: string; students: number; created: string; plan?: string }

export function AdminPartners({ rows }: { rows: PartnerRow[] }) {
  const [msg, setMsg] = useState<Record<string, string>>({});
  async function act(id: string, action: 'approve' | 'suspend') {
    const r = await fetch(`/api/admin/partners/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await r.json();
    setMsg((m) => ({ ...m, [id]: j.error ? j.error : `Now ${j.data.status}. Refresh to update the list.` }));
  }
  async function plan(id: string, productCode: string) {
    const ref = window.prompt('Payment reference you checked (UTR) - used so pressing twice does not extend twice:');
    if (!ref) return;
    const r = await fetch('/api/admin/commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'org_activate', userId: id, productCode, ref }) });
    const j = await r.json();
    setMsg((m) => ({ ...m, [id]: j.error ? j.error : `Plan active until ${j.data.accessUntil}. Refresh to update the list.` }));
  }
  return (
    <div>
      {rows.length === 0 && <p style={{ color: 'var(--slate)' }}>No parent, tutor or centre accounts yet.</p>}
      {rows.map((p) => (
        <div key={p.userId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <strong>{p.displayName}</strong> <span style={{ color: 'var(--slate)' }}>{p.role} · {p.email}</span> · <strong>{p.status}</strong>
          <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{[p.city, p.details].filter(Boolean).join(' · ') || 'No details given'} · students linked: {p.students} · joined {p.created}{p.plan ? ` · plan: ${p.plan}` : ''}</div>
          <div className="hero__actions" style={{ marginTop: '0.4rem' }}>
            {p.status !== 'active' && <button className="btn btn--accent btn--small" onClick={() => act(p.userId, 'approve')}>Approve</button>}
            {p.status === 'active' && <button className="btn btn--ghost btn--small" onClick={() => act(p.userId, 'suspend')}>Suspend</button>}
            {p.status === 'active' && (p.role === 'tutor' || p.role === 'centre') && <button className="btn btn--accent btn--small" onClick={() => plan(p.userId, p.role === 'tutor' ? 'founding_tutor' : 'founding_centre')}>Activate / renew paid plan (1 month)</button>}
          </div>
          {msg[p.userId] && <p style={{ fontSize: '0.9rem' }}>{msg[p.userId]}</p>}
        </div>
      ))}
    </div>
  );
}
