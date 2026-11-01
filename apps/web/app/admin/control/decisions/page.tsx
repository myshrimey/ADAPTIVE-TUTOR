import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { decisionConflicts } from '@adaptive-tutor/core';
import { ControlNav, SourceNote } from '@/components/ControlNav';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { reg, source } = await getControl();
  const made = reg.decisions.filter((d) => d.kind === 'made'); const waiting = reg.decisions.filter((d) => d.kind === 'waiting');
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Decision register</h1>
        <p style={{ color: 'var(--slate)' }}>What you decided, and what is waiting for you. A decision is never reversed silently. The &quot;may touch&quot; hint is a simple word match to help you spot overlaps; it is not a ruling.</p>
        <AdminNav /><ControlNav here="/admin/control/decisions" /><SourceNote source={source} /></div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Waiting for you ({waiting.length})</h2>
      {waiting.map((d) => { const c = decisionConflicts(d, made); return (
        <div key={d.id} style={{ borderTop: '1px solid #ddd', padding: '8px 0' }}><strong>{d.id}</strong> · {d.decision}<div style={{ color: 'var(--slate)', fontSize: '0.86rem' }}>Claude recommends: {d.recommendation}</div><div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Affects: {d.affects}</div>{c.length > 0 && <div style={{ fontSize: '0.8rem', color: '#8a5a00' }}>May touch earlier decisions about: {c.join('; ')}</div>}</div>); })}
      {waiting.length === 0 && <p>Nothing is waiting.</p>}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Decisions on record ({made.length})</h2>
      <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', fontSize: '0.86rem', width: '100%' }}><thead><tr style={{ textAlign: 'left' }}><th>ID</th><th>Date</th><th>Decision</th><th>Affects</th><th>Status</th><th>Source</th></tr></thead>
        <tbody>{made.map((d) => <tr key={d.id} style={{ verticalAlign: 'top', borderTop: '1px solid #ddd' }}><td style={{ paddingRight: 8 }}>{d.id}</td><td style={{ paddingRight: 8, whiteSpace: 'nowrap' }}>{d.decided_on}</td><td style={{ paddingRight: 8 }}>{d.decision}</td><td style={{ paddingRight: 8 }}>{d.affects}</td><td style={{ paddingRight: 8 }}>{d.status}</td><td style={{ color: 'var(--slate)' }}>{d.source}</td></tr>)}</tbody></table></div>
    </div></main>
  );
}
