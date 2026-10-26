'use client';
import { useState } from 'react';

const BTN: [string, string][] = [['approve', 'Approve'], ['reject', 'Reject'], ['modify', 'Modify'], ['investigate', 'Investigate'], ['defer', 'Defer']];
const FOLLOW: Record<string, [string, string][]> = {
  approved: [['implemented', 'Mark implemented'], ['rejected', 'Reject']],
  modified: [['implemented', 'Mark implemented'], ['under_review', 'Back to review'], ['rejected', 'Reject']],
  implemented: [['verified', 'Mark verified'], ['rolled_back', 'Mark rolled back']],
  verified: [['rolled_back', 'Mark rolled back']],
};
const DECIDABLE = ['new', 'analysed', 'proposed', 'under_review', 'deferred', 'rejected'];

export function FeedbackReview({ id, status, risk }: { id: string; status: string; risk: string }) {
  const [note, setNote] = useState('');
  const [tested, setTested] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{ messages: any[]; events: any[] } | null>(null);

  async function call(body: any) {
    const r = await fetch('/api/admin/feedback-intel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clusterId: id, ...body }) });
    return r.json();
  }
  async function decide(extra: any) {
    setBusy(true); setMsg(null);
    const j = await call({ action: 'decide', note, tested, ...extra });
    setBusy(false);
    if (j.error) setMsg(j.error); else { setMsg('Recorded. Reloading…'); setTimeout(() => location.reload(), 600); }
  }
  async function show() { if (detail) { setDetail(null); return; } const j = await call({ action: 'messages' }); if (!j.error) setDetail(j.data); }

  return (
    <div style={{ marginTop: '0.6rem' }}>
      <button type="button" className="btn btn--ghost btn--small" onClick={show}>{detail ? 'Hide messages' : 'Read the messages'}</button>
      {detail && (
        <div style={{ margin: '0.5rem 0', fontSize: '0.88rem' }}>
          {detail.messages.map((m) => <p key={m.id} style={{ margin: '0.25rem 0', borderLeft: '3px solid var(--line)', paddingLeft: '0.5rem' }}>{m.rating != null ? `${m.rating}/5 · ` : ''}{m.message}{m.duplicate_of ? <em style={{ color: 'var(--slate)' }}> (repeat)</em> : null}</p>)}
          {detail.events.length > 0 && <><strong>History</strong>{detail.events.map((e, i) => <p key={i} style={{ margin: '0.2rem 0', color: 'var(--slate)' }}>{new Date(e.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {e.actor}: {e.from_status} → {e.to_status}{e.note ? ` — ${e.note}` : ''}</p>)}</>}
        </div>
      )}
      {(DECIDABLE.includes(status) || FOLLOW[status]) && (
        <>
          <label style={{ display: 'block', margin: '0.4rem 0 0.2rem', fontSize: '0.85rem' }}>Your note {risk === 'high' ? '(required for this high-risk group)' : '(optional)'}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ display: 'block', width: '100%', padding: '0.4rem' }} />
          </label>
          {risk === 'high' && <label style={{ display: 'block', fontSize: '0.85rem' }}><input type="checkbox" checked={tested} onChange={(e) => setTested(e.target.checked)} /> I have tested this</label>}
          <div className="hero__actions" style={{ marginTop: '0.4rem' }}>
            {DECIDABLE.includes(status) && BTN.map(([k, l]) => <button key={k} type="button" disabled={busy} className={`btn btn--small ${k === 'approve' ? 'btn--accent' : 'btn--ghost'}`} onClick={() => decide({ decision: k })}>{l}</button>)}
            {(FOLLOW[status] ?? []).map(([k, l]) => <button key={k} type="button" disabled={busy} className="btn btn--small btn--ghost" onClick={() => decide({ moveTo: k })}>{l}</button>)}
          </div>
        </>
      )}
      {msg && <p role="status" style={{ margin: '0.4rem 0' }}>{msg}</p>}
    </div>
  );
}
