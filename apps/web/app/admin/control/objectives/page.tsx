import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { rollup } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { reg, source } = await getControl();
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Objective tracker</h1>
        <p style={{ color: 'var(--slate)' }}>Every objective from every prompt that is tracked requirement by requirement. Open one to see its requirements and the tasks that serve them.</p>
        <AdminNav /><ControlNav here="/admin/control/objectives" /><SourceNote source={source} /></div>
      {reg.objectives.map((o) => {
        const rs = reg.requirements.filter((r) => r.prompt_id === o.prompt_id && r.objective_code === o.code); const r2 = rollup(rs);
        const codes = new Set(rs.map((r) => r.code));
        const ts = reg.tasks.filter((t) => t.prompt_id === o.prompt_id && (t.objective_code === o.code || t.requirements.split(',').some((c) => codes.has(c.trim()))));
        return (
          <details key={o.id} style={{ borderTop: '1px solid #ddd', padding: '8px 0' }}>
            <summary><strong>{o.prompt_id} / {o.code}</strong> · {o.title} — {r2.total} requirements: {r2.done} done, {r2.pending} not started, {r2.blocked} blocked{r2.donePct !== null ? ` (${r2.donePct}% done)` : ''}</summary>
            <h4 style={{ margin: '8px 0 4px' }}>Requirements</h4>
            <ul style={{ fontSize: '0.86rem', lineHeight: 1.5 }}>{rs.map((r) => <li key={r.id}>{r.code}: {r.text} <StatusChip s={r.status} />{r.note && <div style={{ color: 'var(--slate)' }}>{r.note}</div>}</li>)}</ul>
            <h4 style={{ margin: '8px 0 4px' }}>Tasks</h4>
            <ul style={{ fontSize: '0.86rem', lineHeight: 1.5 }}>{ts.map((t) => <li key={t.id}>{t.id}: {t.title} <StatusChip s={t.status} /> <span style={{ color: 'var(--slate)' }}>needs: {t.depends_on || '-'}</span></li>)}{ts.length === 0 && <li>No tasks yet.</li>}</ul>
          </details>);
      })}
      {reg.objectives.length === 0 && <p>No objectives yet.</p>}
    </div></main>
  );
}
