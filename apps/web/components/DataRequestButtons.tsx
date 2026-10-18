'use client';

import { useState } from 'react';

export function DataRequestButtons({ requestId }: { requestId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  async function act(action: 'delete' | 'cancel') {
    const msg = action === 'delete'
      ? 'PERMANENTLY delete this student, all their learning data, payment records and login? This cannot be undone. Export anything you must keep first.'
      : 'Close this request without deleting anything?';
    if (!window.confirm(msg)) return;
    setState('busy');
    const res = await fetch('/api/admin/data-requests/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, action }) });
    const json = await res.json();
    setState(json.error ? 'err' : 'done');
    if (!json.error) window.location.reload();
  }
  return (
    <span style={{ display: 'inline-flex', gap: 8 }}>
      <button type="button" className="btn btn--ghost" onClick={() => act('delete')} disabled={state === 'busy'}>Delete everything</button>
      <button type="button" className="btn btn--ghost" onClick={() => act('cancel')} disabled={state === 'busy'}>Close request</button>
      {state === 'err' && <span style={{ color: 'var(--danger, #b00020)' }}>Failed, try again</span>}
    </span>
  );
}
