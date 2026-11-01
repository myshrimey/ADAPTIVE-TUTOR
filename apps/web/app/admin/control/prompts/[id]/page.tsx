import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { rollup } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';
import { AcceptSelect } from '@/components/ControlActions';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { id } = await params; const { reg, source } = await getControl();
  const p = reg.prompts.find((x) => x.id === id);
  if (!p) return <main className="page"><div className="shell"><AdminNav /><p>Prompt not found.</p><p><a href="/admin/control">Back</a></p></div></main>;
  const reqs = reg.requirements.filter((r) => r.prompt_id === id); const roll = p.requirement_level ? rollup(reqs) : null;
  const objs = reg.objectives.filter((o) => o.prompt_id === id);
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}><AdminNav /><ControlNav here="/admin/control" /><p><a href="/admin/control">← All prompts</a></p>
        <h1 style={{ fontSize: 'var(--step-2)' }}>{p.id} · {p.title}</h1>
        <p><StatusChip s={p.status} /> · received {p.received_on ?? 'date not recorded'} · your priority: {p.founder_priority ?? 'not set'}</p>
        <SourceNote source={source} />
        <p>{p.objective}</p><p style={{ color: 'var(--slate)' }}>{p.note}</p>
        {roll ? <p><strong>{roll.total}</strong> requirements: {roll.done} done ({roll.donePct}%), {roll.inProgress} in progress or ready for testing, {roll.pending} not started, {roll.blocked} blocked.</p> : <p>Tracked by headline only: the original text is not in the project, so there is no requirement-by-requirement list.</p>}
      </div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Original text</h2>
      {p.original_text ? <details><summary>Show the full original text (word for word)</summary><pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', background: '#f6f6f6', padding: 12, borderRadius: 6 }}>{p.original_text}</pre></details> : <p style={{ color: 'var(--slate)' }}>{p.original_kept ? 'The original is stored in the documents folder.' : 'Not kept. If you want word-for-word tracking, send this prompt again and it will be saved as a new entry.'}</p>}
      {objs.map((o) => {
        const rs = reqs.filter((r) => r.objective_code === o.code); const r2 = rollup(rs);
        return (
          <section key={o.id} style={{ marginTop: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '1.02rem' }}>{o.code}: {o.title}</h3>
            <p style={{ color: 'var(--slate)', fontSize: '0.84rem' }}>{r2.total} requirements, {r2.done} done, {r2.pending} not started, {r2.blocked} blocked.</p>
            <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: '0.86rem', width: '100%' }}>
              <thead><tr style={{ textAlign: 'left' }}><th>Req</th><th>Requirement</th><th>Status</th><th>Your acceptance</th><th>Evidence / note</th></tr></thead>
              <tbody>{rs.map((r) => (<tr key={r.id} style={{ verticalAlign: 'top', borderTop: '1px solid #ddd' }}><td style={{ paddingRight: 8 }}>{r.code}</td><td style={{ paddingRight: 8 }}>{r.text}</td><td style={{ paddingRight: 8 }}><StatusChip s={r.status} /></td><td style={{ paddingRight: 8 }}>{source === 'database' ? <AcceptSelect promptId={id} code={r.code} value={r.founder_acceptance} /> : r.founder_acceptance}</td><td style={{ color: 'var(--slate)' }}>{r.note}</td></tr>))}</tbody>
            </table></div>
          </section>);
      })}
    </div></main>
  );
}
