import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { dependencyReport } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';

export const dynamic = 'force-dynamic';
const WORDS: Record<string, string> = { done: 'Done', ready: 'Ready to start', waiting_on_tasks: 'Waits for tasks', waiting_on_founder: 'Waits for you', blocked: 'Blocked' };
const FILTERS = ['ready', 'waiting_on_tasks', 'waiting_on_founder', 'blocked', 'done'];
// Super Admin only. Read only. Built from the tasks' own "needs first" column.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const sp = await searchParams; const { reg, source } = await getControl(); const d = dependencyReport(reg.tasks);
  const rows = d.rows.filter((r) => !sp.state || r.state === sp.state);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Dependency register</h1>
        <p style={{ color: 'var(--slate)' }}>Which task waits for which. &quot;Ready&quot; means every earlier task is done and nothing is needed from you. A task that waits for a decision shows the decision.</p>
        <AdminNav /><ControlNav here="/admin/control/dependencies" /><SourceNote source={source} /></div>
      {d.problems.length ? <div className="alert"><strong>Problems in the dependency list:</strong><ul>{d.problems.map((p) => <li key={p}>{p}</li>)}</ul></div> : <p style={{ color: '#1b6b3a' }}>No broken links, self-dependencies or loops.</p>}
      <p>{d.readyCount} task(s) ready to start. Show: <a href="/admin/control/dependencies">all</a> {FILTERS.map((f) => <span key={f}> · <a href={`/admin/control/dependencies?state=${f}`}>{WORDS[f]}</a></span>)}</p>
      <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: '0.86rem', width: '100%' }}>
        <thead><tr style={{ textAlign: 'left' }}><th>Task</th><th>What</th><th>Status</th><th>Position</th><th>Needs first</th><th>Unlocks</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} style={{ verticalAlign: 'top', borderTop: '1px solid #ddd' }}>
          <td style={{ paddingRight: 8, whiteSpace: 'nowrap' }}>{r.id}</td><td style={{ paddingRight: 8, maxWidth: 360 }}>{r.title}</td><td style={{ paddingRight: 8 }}><StatusChip s={r.status} /></td>
          <td style={{ paddingRight: 8 }}>{WORDS[r.state]}</td>
          <td style={{ paddingRight: 8 }}>{[...r.needs, ...r.outside].join(', ') || '-'}{r.unfinished.length > 0 && <div style={{ color: '#8a5a00', fontSize: '0.76rem' }}>not finished: {r.unfinished.join(', ')}</div>}</td>
          <td>{r.unlocks.join(', ') || '-'}</td></tr>)}
          {!rows.length && <tr><td colSpan={6}>Nothing in this view.</td></tr>}</tbody>
      </table></div>
    </div></main>
  );
}
