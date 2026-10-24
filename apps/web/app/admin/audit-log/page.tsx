import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { listAudit } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const rows = await listAudit(createServiceClient(), 300);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Audit log</h1>
        <p style={{ color: 'var(--slate)' }}>Who changed what in the admin area (latest 300). Passwords, keys and answer text are never recorded. Signed in as {g.email}.</p>
        <AdminNav />
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead><tr style={{ textAlign: 'left' }}><th style={{ paddingRight: 12 }}>When</th><th style={{ paddingRight: 12 }}>Who</th><th style={{ paddingRight: 12 }}>What</th><th>Details</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} style={{ verticalAlign: 'top' }}><td style={{ paddingRight: 12 }}>{r.at.slice(0, 16).replace('T', ' ')}</td><td style={{ paddingRight: 12 }}>{r.actor_email ?? ''}</td><td style={{ paddingRight: 12 }}>{r.action} {r.entity}</td><td>{r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail) : ''}</td></tr>)}{!rows.length && <tr><td colSpan={4}>Nothing recorded yet.</td></tr>}</tbody>
      </table>
    </div></main>
  );
}
