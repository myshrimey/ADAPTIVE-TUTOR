import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { CONTROL_STATUSES, depOutside, filterTasks, type TaskFilter } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';
import { NextTaskButton } from '@/components/ControlActions';

export const dynamic = 'force-dynamic';
type SP = Record<string, string | undefined>;
const SORTS = ['id', 'status', 'phase', 'size'] as const;
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const sp = await searchParams; const { reg, source } = await getControl();
  const f: TaskFilter = { status: sp.status || undefined, phase: sp.phase || undefined, prompt: sp.prompt || undefined, q: sp.q, onlyNext: sp.next === '1', sort: (SORTS as readonly string[]).includes(sp.sort ?? '') ? (sp.sort as TaskFilter['sort']) : 'id' };
  const rows = filterTasks(reg.tasks, f); const phases = Array.from(new Set(reg.tasks.map((t) => t.phase))).sort();
  const done = new Set(reg.tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'ACCEPTED BY FOUNDER').map((t) => t.id));
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Task backlog</h1>
        <p style={{ color: 'var(--slate)' }}>&quot;Mark as next&quot; only records your choice. Claude starts a task when you tell Claude to, in the chat. Sizes are rough guesses (S small, M medium, L large, XL very large), not hours.</p>
        <AdminNav /><ControlNav here="/admin/control/tasks" /><SourceNote source={source} /></div>
      <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', margin: '8px 0' }}>
        <label>Status<br /><select name="status" defaultValue={sp.status ?? ''}><option value="">all</option>{CONTROL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Phase<br /><select name="phase" defaultValue={sp.phase ?? ''}><option value="">all</option>{phases.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label>Prompt<br /><select name="prompt" defaultValue={sp.prompt ?? ''}><option value="">all</option>{reg.prompts.filter((p) => p.requirement_level).map((p) => <option key={p.id}>{p.id}</option>)}</select></label>
        <label>Sort by<br /><select name="sort" defaultValue={sp.sort ?? 'id'}>{SORTS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Search<br /><input name="q" defaultValue={sp.q ?? ''} /></label>
        <label><input type="checkbox" name="next" value="1" defaultChecked={sp.next === '1'} /> only my chosen next task</label>
        <button className="btn" type="submit">Filter</button> <a href="/admin/control/tasks">Clear</a>
      </form>
      <p style={{ color: 'var(--slate)', fontSize: '0.84rem' }}>{rows.length} of {reg.tasks.length} tasks shown.</p>
      <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: '0.86rem', width: '100%' }}>
        <thead><tr style={{ textAlign: 'left' }}><th>Task</th><th>Phase</th><th>What</th><th>Needs first</th><th>Size</th><th>Status</th><th>Evidence / note</th><th>Next?</th></tr></thead>
        <tbody>{rows.map((t) => {
          const waitingOn = (t.depends_on.match(/TASK-\d+/g) ?? []).filter((d) => !done.has(d)); const outside = depOutside(t.depends_on);
          return (<tr key={t.id} style={{ verticalAlign: 'top', borderTop: '1px solid #ddd', background: t.founder_next ? '#eef6ff' : undefined }}>
            <td style={{ paddingRight: 8, whiteSpace: 'nowrap' }}>{t.id}{t.founder_next ? ' ★' : ''}</td><td style={{ paddingRight: 8 }}>{t.phase}</td>
            <td style={{ paddingRight: 8, maxWidth: 380 }}>{t.title}<div style={{ color: 'var(--slate)', fontSize: '0.76rem' }}>{t.prompt_id} · {t.objective_code} · {t.requirements}</div></td>
            <td style={{ paddingRight: 8 }}>{t.depends_on || '-'}{waitingOn.length > 0 && <div style={{ color: '#8a5a00', fontSize: '0.76rem' }}>not finished: {waitingOn.join(', ')}</div>}{outside.length > 0 && <div style={{ color: '#8a5a00', fontSize: '0.76rem' }}>waiting on you or outside: {outside.join(', ')}</div>}</td>
            <td style={{ paddingRight: 8 }}>{t.size}</td><td style={{ paddingRight: 8 }}><StatusChip s={t.status} /></td><td style={{ color: 'var(--slate)', maxWidth: 300 }}>{t.note || t.verification}</td>
            <td>{source === 'database' ? <NextTaskButton taskId={t.id} isNext={t.founder_next} /> : '—'}</td></tr>);
        })}</tbody></table></div>
      {rows.length === 0 && <p>No task matches these filters.</p>}
    </div></main>
  );
}
