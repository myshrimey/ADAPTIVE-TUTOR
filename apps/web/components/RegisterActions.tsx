'use client';
import { useState } from 'react';

async function post(body: any) { const r = await fetch('/api/admin/question-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

export function ReviewButtons({ table, id }: { table: string; id: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(decision: string) {
    const note = decision === 'approve' ? '' : window.prompt('Short reason (optional)') ?? '';
    setBusy(true); const j = await post({ action: 'review', table, id, decision, note }); setBusy(false);
    setMsg(j.error ? j.error : decision === 'approve' ? 'Approved' : 'Rejected');
  }
  return <span>{msg ?? <><button disabled={busy} className="btn btn--ghost btn--small" onClick={() => go('approve')}>Approve</button> <button disabled={busy} className="btn btn--ghost btn--small" onClick={() => go('reject')}>Reject</button></>}</span>;
}

export function RequestButtons({ id, status }: { id: string; status: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(body: any, ok: string) { setBusy(true); setMsg('Working…'); const j = await post({ ...body, id }); setBusy(false); setMsg(j.error ? j.error : ok + (j.data?.made != null ? ` (${j.data.made} written)` : '')); }
  return <span>
    <button disabled={busy} className="btn btn--ghost btn--small" onClick={() => run({ action: 'request_ai' }, 'AI wrote questions')}>Write with AI</button>{' '}
    {status !== 'fulfilled' && <button disabled={busy} className="btn btn--ghost btn--small" onClick={() => run({ action: 'request_status', status: 'fulfilled' }, 'Marked done')}>Mark done</button>}{' '}
    {status !== 'declined' && <button disabled={busy} className="btn btn--ghost btn--small" onClick={() => run({ action: 'request_status', status: 'declined' }, 'Declined')}>Decline</button>}
    {msg && <span style={{ marginLeft: '0.4rem' }}>{msg}</span>}
  </span>;
}
