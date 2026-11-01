import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { currentExecution, QA_CHECKLISTS, QA_KINDS, QA_LABEL, QA_NOTE } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';

export const dynamic = 'force-dynamic';
// Super Admin only. Read only. Checklists are for a person to try with TEST accounts; this page does not record results.
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { reg, source } = await getControl(); const c = currentExecution(reg);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Testing and QA</h1>
        <p style={{ color: 'var(--slate)' }}>What waits for your check, how the automated tests are run, and a checklist for each kind of account. Results are not saved on this page: tick on paper or in your own notes. Use TEST accounts, never a real family&apos;s.</p>
        <AdminNav /><ControlNav here="/admin/control/testing" /><SourceNote source={source} /></div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Waiting for your check ({c.waitingForFounderCheck.length})</h2>
      {c.waitingForFounderCheck.length ? <ul>{c.waitingForFounderCheck.map((t) => <li key={t.id}><strong>{t.id}</strong> {t.title} <StatusChip s={t.status} /><div style={{ color: 'var(--slate)', fontSize: '0.82rem' }}>{t.verification || t.note}</div></li>)}</ul> : <p style={{ color: 'var(--slate)' }}>Nothing.</p>}
      <p style={{ color: 'var(--slate)', fontSize: '0.86rem' }}>Only you can accept a requirement (on its prompt page). Claude never marks something accepted.</p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Automated tests</h2>
      <p>On the developer computer run <code>npm test</code> (about a minute). It runs every file in <code>tests/</code>; four old tests are listed as known-stale and one engagement test (t57b) can fail by chance about 1 run in 25. These tests do not call your live website: nothing automatic tests it yet.</p>
      {QA_KINDS.map((k) => <section key={k} style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 'var(--step-1)' }}>{QA_LABEL[k]} checklist</h2><p style={{ color: 'var(--slate)', fontSize: '0.86rem' }}>{QA_NOTE[k]}</p>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.86rem', width: '100%' }}><thead><tr style={{ textAlign: 'left' }}><th>Done</th><th>Id</th><th>Area</th><th>Try this</th><th>Page</th><th>Needs</th></tr></thead>
          <tbody>{QA_CHECKLISTS[k].map((i) => <tr key={i.id} style={{ verticalAlign: 'top', borderTop: '1px solid #ddd' }}><td style={{ paddingRight: 8 }}>☐</td><td style={{ paddingRight: 8, whiteSpace: 'nowrap' }}>{i.id}</td><td style={{ paddingRight: 8 }}>{i.area}</td><td style={{ paddingRight: 8, maxWidth: 420 }}>{i.check}</td><td style={{ paddingRight: 8 }}><code>{i.route}</code></td><td>{i.needs ?? ''}</td></tr>)}</tbody></table>
      </section>)}
    </div></main>
  );
}
