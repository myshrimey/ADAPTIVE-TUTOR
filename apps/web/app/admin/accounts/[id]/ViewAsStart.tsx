'use client';
import { useState } from 'react';

// v140: starts a read-only, 15-minute, recorded view of this student account. A reason is required and kept in the Audit log.
export default function ViewAsStart({ userId }: { userId: string }) {
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/admin/view-as', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, reason }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.data?.url) { window.location.href = j.data.url; return; }
      setMsg(j.message ?? 'Could not start the view.');
    } catch { setMsg('Could not start the view.'); }
    setBusy(false);
  }
  return (
    <div style={{ margin: '12px 0', padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
      <strong>View as this student (read only, 15 minutes)</strong>
      <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>You stay signed in as yourself and cannot change anything. A reason is required and is recorded in the Audit log with the account.</p>
      <input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you looking? (8 to 200 characters)" style={{ width: '70%', maxWidth: 420, marginRight: 8 }} />
      <button type="button" onClick={start} disabled={busy}>Start view</button> <span role="status">{msg}</span>
    </div>
  );
}
