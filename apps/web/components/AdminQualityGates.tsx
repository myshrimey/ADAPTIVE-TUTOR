'use client';

import { useState } from 'react';
import type { SubjectGateReport } from '@adaptive-tutor/core';

export function AdminQualityGates({ report }: { report: SubjectGateReport }) {
  const [gates, setGates] = useState(report.gates);
  const [status, setStatus] = useState(report.status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const passed = gates.filter((g) => g.passed).length;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/quality', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: report.subjectId, ...body }) });
    const json = await res.json();
    setBusy(false);
    if (json.error) setMsg(json.error === 'all_ten_gates_required' ? 'All ten gates must be signed off first.' : json.error);
    return json;
  }

  async function toggle(gate: number, next: boolean, note: string) {
    const json = await post({ action: 'signoff', gate, passed: next, note });
    if (!json.error) setGates((prev) => prev.map((g) => (g.gate === gate ? { ...g, passed: next, note: note || null } : g)));
  }

  return (
    <article className="chapter-row" style={{ display: 'block', marginTop: '1rem' }}>
      <h2 style={{ fontSize: 'var(--step-1)', margin: 0 }}>{report.name} <span className="subject-chip__score">{status}</span></h2>
      <p style={{ margin: '0.3rem 0', fontSize: '0.88rem', color: 'var(--slate)' }}>
        Evidence from the database: {report.evidence.questionsTotal} diagnostic/quiz questions — {report.evidence.verified} verified, {report.evidence.needsReview} waiting for review, {report.evidence.rejected} rejected;
        {' '}{report.evidence.teacherReviews} teacher reviews; {report.evidence.completedDiagnostics} completed diagnostics; {report.evidence.metadataMarksSet} questions with marks set.
        This is only a guide: you sign each gate yourself.
      </p>
      <p style={{ margin: '0.3rem 0' }}><strong>{passed} of {gates.length}</strong> gates signed off.</p>
      {gates.map((g) => (
        <GateLine key={g.gate} g={g} busy={busy} onSave={(next, note) => toggle(g.gate, next, note)} />
      ))}
      {msg && <p className="alert">{msg}</p>}
      <div className="hero__actions" style={{ marginTop: '0.6rem' }}>
        <button
          className="btn btn--accent btn--small"
          disabled={busy || passed !== gates.length || status === 'ready'}
          onClick={async () => { const j = await post({ action: 'promote' }); if (!j.error) setStatus('ready'); }}
        >
          Promote to Ready
        </button>
        <button
          className="btn btn--ghost btn--small"
          disabled={busy || status !== 'ready'}
          onClick={async () => { const j = await post({ action: 'demote' }); if (!j.error) setStatus('pilot'); }}
        >
          Put back to Pilot
        </button>
      </div>
    </article>
  );
}

function GateLine({ g, busy, onSave }: { g: SubjectGateReport['gates'][number]; busy: boolean; onSave: (passed: boolean, note: string) => void }) {
  const [note, setNote] = useState(g.note ?? '');
  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '0.5rem 0' }}>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={g.passed} disabled={busy} onChange={(e) => onSave(e.target.checked, note)} style={{ marginTop: '0.3rem' }} />
        <span>
          <strong>{g.gate}. {g.title}</strong>
          <br /><span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{g.how}</span>
        </span>
      </label>
      <input
        className="field__input"
        style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}
        placeholder="Note (who checked, when, what you saw)"
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => { if ((g.note ?? '') !== note) onSave(g.passed, note); }}
      />
      {g.passed && g.signedBy && <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>Signed by {g.signedBy}</div>}
    </div>
  );
}
