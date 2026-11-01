import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { ControlNav, SourceNote } from '@/components/ControlNav';

export const dynamic = 'force-dynamic';
const num = (id: string) => parseInt(id.replace(/\D+/g, ''), 10) || 0;
// Super Admin only. Read only. Every delivery adds one row (written in scripts/control-centre/build-docs.py).
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { reg, source } = await getControl();
  const rows = [...reg.executions].sort((a, b) => (a.executed_on === b.executed_on ? num(b.id) - num(a.id) : a.executed_on < b.executed_on ? 1 : -1));
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Execution history</h1>
        <p style={{ color: 'var(--slate)' }}>Every delivery: what was done, which files and database changes, which tests, and what is still open. Newest first.</p>
        <AdminNav /><ControlNav here="/admin/control/history" /><SourceNote source={source} /></div>
      {rows.map((e) => <article key={e.id} style={{ borderTop: '1px solid #ddd', padding: '10px 0' }}>
        <h2 style={{ fontSize: 'var(--step-0)' }}>{e.id} · {e.executed_on}{e.prompt_id ? ` · ${e.prompt_id}` : ''}</h2>
        <p>{e.summary}</p>
        <dl style={{ fontSize: '0.86rem', margin: 0 }}>
          <dt><strong>Files</strong></dt><dd style={{ margin: '0 0 6px' }}>{e.files || '-'}</dd>
          <dt><strong>Database</strong></dt><dd style={{ margin: '0 0 6px' }}>{e.db_changes || '-'}</dd>
          <dt><strong>Tests</strong></dt><dd style={{ margin: '0 0 6px' }}>{e.tests || '-'}</dd>
          <dt><strong>Still open</strong></dt><dd style={{ margin: 0 }}>{e.open_problems || '-'}</dd>
        </dl></article>)}
      {!rows.length && <p>No deliveries recorded.</p>}
    </div></main>
  );
}
