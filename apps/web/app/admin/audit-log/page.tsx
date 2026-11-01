import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { listAudit } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

// Super Admin only. Read-only: the database blocks edits and deletes of these rows (migration 0057).
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = (await searchParams) ?? {};
  const f = { action: one(sp.action).slice(0, 60), actor: one(sp.actor).slice(0, 80), target: one(sp.target).slice(0, 80), outcome: one(sp.outcome).slice(0, 20) };
  const rows = await listAudit(createServiceClient(), 300, f);
  const box = { padding: '4px 8px', marginRight: 8 } as const;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Audit log</h1>
        <p style={{ color: 'var(--slate)' }}>Who did what in the admin area, to which account, and whether it worked (latest 300). Passwords, keys and answer text are never recorded. Records cannot be edited or deleted from the app (after migration 0057 is applied). Signed in as {g.email}.</p>
        <AdminNav />
        <form method="get" style={{ margin: '12px 0' }}>
          <input name="action" defaultValue={f.action} placeholder="Action, e.g. payment" style={box} aria-label="Action" />
          <input name="actor" defaultValue={f.actor} placeholder="Who (email)" style={box} aria-label="Who" />
          <input name="target" defaultValue={f.target} placeholder="Account id" style={box} aria-label="Account id" />
          <select name="outcome" defaultValue={f.outcome} style={box} aria-label="Outcome"><option value="">Any outcome</option><option value="success">success</option><option value="failed">failed</option><option value="denied">denied</option></select>
          <button type="submit" style={box}>Filter</button>
        </form>
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead><tr style={{ textAlign: 'left' }}><th style={{ paddingRight: 12 }}>When</th><th style={{ paddingRight: 12 }}>Who</th><th style={{ paddingRight: 12 }}>What</th><th style={{ paddingRight: 12 }}>Account</th><th style={{ paddingRight: 12 }}>Outcome</th><th style={{ paddingRight: 12 }}>Reason</th><th>Details</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} style={{ verticalAlign: 'top' }}><td style={{ paddingRight: 12 }}>{r.at.slice(0, 16).replace('T', ' ')}</td><td style={{ paddingRight: 12 }}>{r.actor_email ?? ''}</td><td style={{ paddingRight: 12 }}>{r.action} {r.entity}</td><td style={{ paddingRight: 12 }}>{r.target_account ? String(r.target_account).slice(0, 8) : ''}</td><td style={{ paddingRight: 12 }}>{r.outcome ?? ''}</td><td style={{ paddingRight: 12 }}>{r.reason ?? ''}</td><td>{r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail) : ''}</td></tr>)}{!rows.length && <tr><td colSpan={7}>Nothing recorded yet.</td></tr>}</tbody>
      </table>
    </div></main>
  );
}
