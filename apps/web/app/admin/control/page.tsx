import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { CONTROL_STATUSES, filterPrompts, resumeReport, rollup, type PromptFilter } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';
import { ImportButton, PrioritySelect } from '@/components/ControlActions';

export const dynamic = 'force-dynamic';
type SP = Record<string, string | undefined>;
const num = (s?: string) => (s !== undefined && s !== '' && !Number.isNaN(Number(s)) ? Number(s) : undefined);

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const g = await adminPageGate(); if ('gate' in g) return g.gate; // Super Admin only
  const sp = await searchParams; const { reg, source } = await getControl();
  const f: PromptFilter = { status: sp.status || undefined, priority: sp.priority || undefined, category: sp.category || undefined, q: sp.q, minPct: num(sp.min), maxPct: num(sp.max), from: sp.from || undefined, to: sp.to || undefined };
  const rows = filterPrompts(reg, f); const rr = resumeReport(reg);
  const categories = Array.from(new Set(reg.prompts.map((p) => p.category))).sort();
  const nextTask = reg.tasks.find((t) => t.founder_next);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Development control centre</h1>
        <p style={{ color: 'var(--slate)' }}>Every master prompt, what it asks for, and where it stands. You choose the order; nothing here starts any work by itself. Signed in as {g.email}.</p>
        <AdminNav /><ControlNav here="/admin/control" />
        <SourceNote source={source} />
        <p><ImportButton /></p>
      </div>

      <h2 style={{ fontSize: 'var(--step-1)' }}>Resume report</h2>
      <ul style={{ lineHeight: 1.7 }}>
        <li><strong>{rr.prompts}</strong> master prompts registered ({rr.promptsTrackedByRequirement} tracked requirement by requirement, the rest by headline only); <strong>{rr.objectives}</strong> objectives; <strong>{rr.requirements}</strong> requirements.</li>
        <li>Requirements: {rr.completed} completed, {rr.acceptedByFounder} accepted by you, {rr.inProgress} in progress or ready for testing, {rr.pending} not started, {rr.blocked} blocked.</li>
        <li>Tasks: {rr.tasksDone} of {rr.tasks} done. Last completed: {rr.lastCompletedTask ?? '—'}. Next unfinished: {rr.nextUnfinishedTask ?? '—'}.</li>
        <li>Your chosen next task: <strong>{nextTask ? `${nextTask.id} · ${nextTask.title}` : 'none chosen yet'}</strong> (<a href="/admin/control/tasks">choose on the Task backlog</a>).</li>
        <li>Decisions waiting for you: <strong>{rr.decisionsWaiting}</strong> (<a href="/admin/control/decisions">see them</a>).</li>
      </ul>

      <h2 style={{ fontSize: 'var(--step-1)' }}>Master prompts</h2>
      <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', margin: '8px 0' }}>
        <label>Status<br /><select name="status" defaultValue={sp.status ?? ''}><option value="">all</option>{CONTROL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Your priority<br /><select name="priority" defaultValue={sp.priority ?? ''}><option value="">all</option><option value="unset">not set</option><option value="now">now</option><option value="next">next</option><option value="later">later</option><option value="hold">on hold</option></select></label>
        <label>Category<br /><select name="category" defaultValue={sp.category ?? ''}><option value="">all</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Done % from<br /><input name="min" type="number" min={0} max={100} defaultValue={sp.min ?? ''} style={{ width: 70 }} /></label>
        <label>to<br /><input name="max" type="number" min={0} max={100} defaultValue={sp.max ?? ''} style={{ width: 70 }} /></label>
        <label>Received from<br /><input name="from" type="date" defaultValue={sp.from ?? ''} /></label>
        <label>to<br /><input name="to" type="date" defaultValue={sp.to ?? ''} /></label>
        <label>Search<br /><input name="q" defaultValue={sp.q ?? ''} /></label>
        <button className="btn" type="submit">Filter</button> <a href="/admin/control">Clear</a>
      </form>
      <p style={{ color: 'var(--slate)', fontSize: '0.84rem' }}>{rows.length} of {reg.prompts.length} shown. &quot;Done %&quot; counts only requirements that are COMPLETED or accepted; &quot;ready for testing&quot; is not counted as done. Prompts tracked by headline only show no percentage.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem', width: '100%' }}>
          <thead><tr style={{ textAlign: 'left' }}><th>ID</th><th>Title</th><th>Received</th><th>Requirements</th><th>Done</th><th>Pending</th><th>Blocked</th><th>Done %</th><th>Status</th><th>Your priority</th></tr></thead>
          <tbody>{rows.map(({ p, roll }) => (
            <tr key={p.id} style={{ verticalAlign: 'top', borderTop: '1px solid #ddd' }}>
              <td style={{ paddingRight: 10 }}><a href={`/admin/control/prompts/${p.id}`}>{p.id}</a></td>
              <td style={{ paddingRight: 10, maxWidth: 360 }}>{p.title}<div style={{ color: 'var(--slate)', fontSize: '0.78rem' }}>{p.objective}</div></td>
              <td style={{ paddingRight: 10 }}>{p.received_on ?? 'not recorded'}</td>
              <td>{roll ? roll.total : 'headline only'}</td><td>{roll ? roll.done : '—'}</td><td>{roll ? roll.pending : '—'}</td><td>{roll ? roll.blocked : '—'}</td><td>{roll?.donePct !== undefined && roll?.donePct !== null ? `${roll.donePct}%` : '—'}</td>
              <td style={{ paddingRight: 10 }}><StatusChip s={p.status} /></td>
              <td>{source === 'database' ? <PrioritySelect promptId={p.id} value={p.founder_priority} /> : (p.founder_priority ?? 'not set')}</td>
            </tr>))}</tbody>
        </table>
      </div>
      {rows.length === 0 && <p>No prompt matches these filters.</p>}
    </div></main>
  );
}
