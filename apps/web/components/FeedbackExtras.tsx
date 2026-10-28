'use client';
import { useState } from 'react';

async function post(body: any) {
  try { const r = await fetch('/api/admin/feedback-intel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return (await r.json()) as { data: any; error: string | null }; }
  catch { return { data: null, error: 'Could not reach the server. Check your connection and try again.' }; }
}
const MOAT = ['none', 'low', 'medium', 'high', 'core'];
const VAL: [string, string][] = [['fixed_validated', 'Fixed and validated'], ['fixed_not_validated', 'Fixed, not yet validated'], ['partial', 'Partly fixed'], ['not_fixed', 'Not fixed (reopen)'], ['regression', 'Regression (reopen)'], ['reopened', 'Reopen']];

// Per-group extras: moat tag, priority override, optional AI analysis, product task, post-fix validation. Every button only records a decision or a note.
export function FeedbackExtras({ id, status, moat, override, task, ai, validation }: { id: string; status: string; moat: string; override: string | null; task: any; ai: any; validation: string | null }) {
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [pr, setPr] = useState({ level: override ?? '', reason: '' });
  const [t, setT] = useState({ title: task?.title ?? '', problem: '', expected: '', acceptance: '', assignee: '', targetRelease: '' });
  const [v, setV] = useState({ outcome: 'fixed_validated', version: '', note: '' });
  async function run(body: any, ok: string) { setBusy(true); setMsg(null); const j = await post({ clusterId: id, ...body }); setBusy(false); if (j.error) setMsg(j.error); else { setMsg(`${ok} Reloading...`); setTimeout(() => location.reload(), 700); } }
  return (
    <div style={{ marginTop: '0.6rem', fontSize: '0.88rem' }}>
      <div className="hero__actions" style={{ alignItems: 'center' }}>
        <label>Moat value: <select value={moat} onChange={(e) => run({ action: 'moat', moat: e.target.value }, 'Saved.')}>{MOAT.map((m) => <option key={m}>{m}</option>)}</select></label>
        <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => run({ action: 'ai' }, 'AI recommendation saved.')}>{ai ? 'Ask AI again' : 'Ask AI to analyse (optional)'}</button>
      </div>
      <details style={{ marginTop: '0.4rem' }}><summary>Change the priority by hand</summary>
        <select value={pr.level} onChange={(e) => setPr({ ...pr, level: e.target.value })}><option value="">Use the formula</option>{['P0', 'P1', 'P2', 'P3'].map((p) => <option key={p}>{p}</option>)}</select>
        <input placeholder="Why? (required, it is recorded)" value={pr.reason} onChange={(e) => setPr({ ...pr, reason: e.target.value })} style={{ display: 'block', width: '100%', margin: '0.3rem 0', padding: '0.4rem' }} />
        <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => run({ action: 'priority', level: pr.level || null, reason: pr.reason }, 'Priority recorded.')}>Save priority</button></details>
      {['approved', 'modified', 'implemented'].includes(status) && (
        <details style={{ marginTop: '0.4rem' }}><summary>{task ? `Task written: ${task.title}` : 'Write a product task'}</summary>
          {task && <p style={{ color: 'var(--slate)' }}>Acceptance: {task.acceptance}{task.assignee ? ` · assigned to ${task.assignee}` : ''}{task.targetRelease ? ` · target ${task.targetRelease}` : ''}. Saved on {new Date(task.createdAt).toLocaleDateString('en-IN')}.</p>}
          {(['title', 'problem', 'expected', 'acceptance', 'assignee', 'targetRelease'] as const).map((k) => <input key={k} placeholder={({ title: 'Task title', problem: 'The problem', expected: 'What should happen instead', acceptance: 'How will we know it is fixed? (required)', assignee: 'Assigned to (optional)', targetRelease: 'Target release, e.g. v74 (optional)' })[k]} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} style={{ display: 'block', width: '100%', margin: '0.25rem 0', padding: '0.4rem' }} />)}
          <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => run({ action: 'task', ...t }, 'Task saved. (Nothing is changed in the app by this.)')}>Save task</button></details>
      )}
      {['implemented', 'verified', 'rolled_back'].includes(status) && (
        <details style={{ marginTop: '0.4rem' }} open={status === 'implemented' && !validation}><summary>After the fix: did it work?{validation ? ` (last: ${validation.replace(/_/g, ' ')})` : ''}</summary>
          <select value={v.outcome} onChange={(e) => setV({ ...v, outcome: e.target.value })}>{VAL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input placeholder="Version or date it went live (e.g. v73)" value={v.version} onChange={(e) => setV({ ...v, version: e.target.value })} style={{ display: 'block', width: '100%', margin: '0.3rem 0', padding: '0.4rem' }} />
          <input placeholder="What did you see? (needed unless fixed and validated)" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} style={{ display: 'block', width: '100%', margin: '0.3rem 0', padding: '0.4rem' }} />
          <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => run({ action: 'validate', ...v }, 'Recorded.')}>Record</button></details>
      )}
      {msg && <p role="status" style={{ margin: '0.4rem 0' }}>{msg}</p>}
    </div>
  );
}

export function ManualFeedbackForm({ sources, roles, impacts }: { sources: Record<string, string>; roles: Record<string, string>; impacts: Record<string, string> }) {
  const [f, setF] = useState({ source: 'phone', person: '', role: 'parent', receivedOn: '', message: '', context: '', impact: '' });
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); setMsg(null); const j = await post({ action: 'manual', ...f }); setBusy(false); if (j.error) setMsg(j.error); else { setMsg('Saved and sorted into a group. Reloading...'); setTimeout(() => location.reload(), 700); } }
  const sel = (k: 'source' | 'role' | 'impact', o: Record<string, string>, none?: string) => <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{none !== undefined && <option value="">{none}</option>}{Object.entries(o).filter(([key]) => !(k === 'source' && key === 'in_app')).map(([key, l]) => <option key={key} value={key}>{l}</option>)}</select>;
  return (
    <details style={{ margin: '0.8rem 0' }}><summary style={{ fontWeight: 600, cursor: 'pointer' }}>Add feedback you received outside the app (call, meeting, WhatsApp, email...)</summary>
      <p style={{ fontSize: '0.85rem' }}>Type what the person said, in their words. It is sorted and grouped exactly like feedback from the app. Do not paste phone numbers, addresses or a child&rsquo;s full name.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
        {sel('source', sources)}{sel('role', roles)}{sel('impact', impacts, 'How it affected them (optional)')}
        <input placeholder="Person or organisation (optional)" value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} style={{ padding: '0.4rem' }} />
        <input type="date" value={f.receivedOn} onChange={(e) => setF({ ...f, receivedOn: e.target.value })} style={{ padding: '0.4rem' }} aria-label="Date received" />
        <input placeholder="Context, e.g. after the baseline test (optional)" value={f.context} onChange={(e) => setF({ ...f, context: e.target.value })} style={{ padding: '0.4rem' }} />
      </div>
      <textarea rows={3} placeholder="What did they say?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} style={{ display: 'block', width: '100%', margin: '0.5rem 0', padding: '0.4rem' }} />
      <button type="button" className="btn btn--small btn--accent" disabled={busy} onClick={save}>Save feedback</button>
      {msg && <p role="status">{msg}</p>}
    </details>
  );
}
