'use client';
import { useState } from 'react';

// v143: mark or unmark a student account as a TEST account. A label only: it changes nothing the account can do. Reason required, kept in the Audit log.
export default function TestMark({ userId, marked }: { userId: string; marked: boolean }) {
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/admin/test-accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, mark: !marked, reason }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { window.location.reload(); return; }
      setMsg(j.message ?? 'Could not save the mark.');
    } catch { setMsg('Could not save the mark.'); }
    setBusy(false);
  }
  return (
    <div style={{ margin: '12px 0', padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
      <strong>{marked ? 'This is marked as a TEST account' : 'Test account'}</strong>
      <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>{marked ? 'It is left out of the activity numbers. The mark changes nothing the account can do.' : 'Mark a student login you use for testing so it does not count as a real family. It changes nothing the account can do.'} A reason is required and is recorded in the Audit log.</p>
      <input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (8 to 200 characters)" style={{ width: '70%', maxWidth: 420, marginRight: 8 }} />
      <button type="button" onClick={save} disabled={busy}>{marked ? 'Remove test mark' : 'Mark as test account'}</button> <span role="status">{msg}</span>
    </div>
  );
}
