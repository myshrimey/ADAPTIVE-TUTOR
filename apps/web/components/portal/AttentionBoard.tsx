'use client';
import { useState } from 'react';

const KIND: Record<string, { label: string; color: string }> = {
  intervene: { label: 'Needs a conversation', color: '#b5533c' }, watch: { label: 'Keep an eye', color: '#c8811f' }, no_data: { label: 'Not enough information yet', color: '#6b7280' },
  ready_for_advanced: { label: 'Ready for harder work', color: '#2f6fb0' }, on_track: { label: 'Going well', color: '#3f7a5c' },
};
const RESULT: Record<string, string> = {
  improved: 'Score is higher than before (may be due to the session, but other practice counts too).', no_change: 'Score has not moved much yet.',
  lower: 'Score is lower than before; look at recent answers together.', not_enough_data: 'Too early, or not enough answers, to say.',
};

export function AttentionBoard({ attention, summary, batches, interventions, students }: { attention: any[]; summary: any; batches: any[]; interventions: any[]; students: { id: string; name: string }[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ problem: '', evidence: '', action: '' });
  const [batchName, setBatchName] = useState('');
  async function call(body: any) {
    setMsg(null);
    const r = await fetch('/api/portal/org', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) { setMsg(j.error); return false; }
    location.reload(); return true;
  }
  function begin(a: any) {
    setOpen(a.studentId);
    setForm({ problem: a.reasons.join('; '), evidence: a.evidence, action: a.suggestion });
  }
  return (
    <div>
      <div className="stat-tile-row">
        <div className="stat-tile"><div className="stat-tile__value">{summary.students}</div><div className="stat-tile__label">Students</div></div>
        <div className="stat-tile"><div className="stat-tile__value">{summary.active7}</div><div className="stat-tile__label">Active in 7 days</div></div>
        <div className="stat-tile"><div className="stat-tile__value">{summary.needAttention}</div><div className="stat-tile__label">Need a conversation</div></div>
        <div className="stat-tile"><div className="stat-tile__value">{summary.ready}</div><div className="stat-tile__label">Ready for harder work</div></div>
      </div>
      {summary.commonGaps.length > 0 && <p style={{ marginTop: '0.8rem' }}><strong>Gaps shared by two or more students:</strong> {summary.commonGaps.map((g: any) => `${g.name} (${g.students})`).join(', ')}. A short group session may save time.</p>}
      {msg && <p role="status" className="alert">{msg}</p>}

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Who needs my attention</h2>
      {attention.length === 0 && <p style={{ color: 'var(--slate)' }}>No students are linked yet.</p>}
      {attention.map((a) => (
        <div key={a.studentId} className="chapter-row" style={{ display: 'block', borderLeft: `5px solid ${KIND[a.kind].color}`, marginTop: '0.6rem' }}>
          <strong>{a.name}</strong> <span style={{ color: KIND[a.kind].color }}>· {KIND[a.kind].label}</span>
          <div style={{ fontSize: '0.9rem' }}>{a.reasons.join(' · ')}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{a.evidence}</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>Suggestion:</strong> {a.suggestion}</div>
          {(a.kind === 'intervene' || a.kind === 'watch') && open !== a.studentId && <button className="btn btn--ghost btn--small" style={{ marginTop: '0.4rem' }} onClick={() => begin(a)}>Plan an intervention</button>}
          {open === a.studentId && (
            <div style={{ marginTop: '0.5rem' }}>
              {(['problem', 'evidence', 'action'] as const).map((k) => <label key={k} style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{k[0].toUpperCase() + k.slice(1)}<textarea rows={2} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ display: 'block', width: '100%', padding: '0.4rem' }} /></label>)}
              <button className="btn btn--accent btn--small" onClick={() => call({ action: 'create_intervention', studentId: a.studentId, skillId: a.focusSkill?.skillId, problem: form.problem, evidence: form.evidence, plan: form.action })}>Save plan</button>{' '}
              <button className="btn btn--ghost btn--small" onClick={() => setOpen(null)}>Cancel</button>
            </div>
          )}
        </div>
      ))}

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Interventions</h2>
      <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>Problem → evidence → action → result. The result compares the skill score before and after (at least 5 days later). It shows what happened; it cannot prove what caused it.</p>
      {interventions.length === 0 && <p style={{ color: 'var(--slate)' }}>None yet.</p>}
      {interventions.map((i) => (
        <div key={i.id} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
          <strong>{i.studentName}</strong> · {i.status === 'planned' ? 'Planned' : i.status === 'done' ? 'Done' : 'Dropped'}
          <div style={{ fontSize: '0.9rem' }}><strong>Problem:</strong> {i.problem}</div>
          {i.evidence && <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{i.evidence}</div>}
          <div style={{ fontSize: '0.9rem' }}><strong>Action:</strong> {i.action}</div>
          {i.status === 'done' && <div style={{ fontSize: '0.9rem' }}><strong>Result:</strong> {RESULT[i.result ?? 'not_enough_data']}{i.baseline_score != null && i.followup_score != null ? ` (${Math.round(i.baseline_score)} → ${Math.round(i.followup_score)})` : ''}</div>}
          {i.status === 'planned' && <div style={{ marginTop: '0.3rem' }}><button className="btn btn--accent btn--small" onClick={() => call({ action: 'update_intervention', id: i.id, status: 'done' })}>Mark done</button> <button className="btn btn--ghost btn--small" onClick={() => call({ action: 'update_intervention', id: i.id, status: 'dropped' })}>Drop</button></div>}
        </div>
      ))}

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Batches</h2>
      <p><input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="New batch name" aria-label="New batch name" style={{ padding: '0.4rem' }} /> <button className="btn btn--accent btn--small" onClick={() => call({ action: 'create_batch', name: batchName })}>Create batch</button></p>
      {batches.map((b) => (
        <div key={b.id} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
          <strong>{b.name}</strong> · {b.summary.students} student(s) · {b.summary.active7} active in 7 days · average {b.summary.averageMastery ?? 'n/a'} · {b.summary.needAttention} need a conversation
          {b.summary.commonGaps.length > 0 && <div style={{ fontSize: '0.88rem' }}>Common gaps: {b.summary.commonGaps.map((g: any) => `${g.name} (${g.students})`).join(', ')}</div>}
          <div style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
            {students.map((s) => { const inB = b.studentIds.includes(s.id); return <label key={s.id} style={{ marginRight: '0.9rem', whiteSpace: 'nowrap' }}><input type="checkbox" checked={inB} onChange={() => call({ action: inB ? 'remove_member' : 'add_member', batchId: b.id, studentId: s.id })} /> {s.name}</label>; })}
          </div>
          <button className="btn btn--ghost btn--small" style={{ marginTop: '0.3rem' }} onClick={() => call({ action: 'archive_batch', batchId: b.id })}>Archive batch</button>
        </div>
      ))}
    </div>
  );
}
