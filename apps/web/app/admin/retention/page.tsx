import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadRetentionReport, writeAudit, RETENTION_EXCLUDED } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const n = (v: number | null) => (v === null ? 'Not available' : v.toLocaleString('en-IN'));

// Super Admin only. DRY RUN: this page counts rows and never deletes anything.
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const rows = await loadRetentionReport(service);
  await writeAudit(service, { actorEmail: g.email, actorRole: 'super_admin', action: 'retention.view', entity: 'retention_report', outcome: 'success' });
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Data retention (dry run)</h1>
        <p className="alert">Nothing is deleted here and nothing is deleted automatically. The periods below are an <strong>interim proposal, not legal advice</strong>. Before any real clean-up of children&apos;s data, a professional who knows India&apos;s Digital Personal Data Protection Act 2023 must confirm the periods (open item D7).</p>
        <AdminNav />
        <p style={{ color: 'var(--slate)' }}>&quot;Older than the period&quot; is how many rows a purge would remove today. To purge, you run <code>scripts/retention/purge-older-than.sql</code> yourself in the Supabase SQL editor, after a backup.</p>
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead><tr style={{ textAlign: 'left' }}>{['Data', 'Kept for', 'Cut-off date', 'Rows now', 'Older than the period', 'Note'].map((h) => <th key={h} style={{ paddingRight: 12 }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.table} style={{ verticalAlign: 'top' }}><td style={{ paddingRight: 12 }}>{r.label}<div style={{ color: 'var(--slate)', fontSize: '0.76rem' }}>{r.table}</div></td><td style={{ paddingRight: 12 }}>{r.days} days</td><td style={{ paddingRight: 12 }}>{r.cutoff.slice(0, 10)}</td><td style={{ paddingRight: 12 }}>{n(r.total)}</td><td style={{ paddingRight: 12 }}>{n(r.older)}</td><td style={{ maxWidth: 360 }}>{r.note}</td></tr>)}</tbody>
      </table>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 20 }}>Never part of a clean-up</h2>
      <ul>{RETENTION_EXCLUDED.map((x) => <li key={x.what}><strong>{x.what}</strong>: {x.why}</li>)}</ul>
    </div></main>
  );
}
