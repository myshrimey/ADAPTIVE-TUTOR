'use client';

import { useState } from 'react';

export function AdminReviewActions({ table, itemId, status }: { table: string; itemId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  async function apply(action: 'verify' | 'reject' | 'reset') {
    setBusy(true);
    const res = await fetch('/api/admin/reviews/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, itemId, action }) });
    const json = await res.json();
    setBusy(false);
    if (!json.error) setCurrent(json.data.status);
  }
  return (
    <div className="hero__actions" style={{ marginTop: '0.4rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.85rem' }}>Status now: <strong>{current}</strong></span>
      <button className="btn btn--accent btn--small" disabled={busy || current === 'verified'} onClick={() => apply('verify')}>Mark verified</button>
      <button className="btn btn--ghost btn--small" disabled={busy || current === 'rejected'} onClick={() => apply('reject')}>Reject (stop showing)</button>
      <button className="btn btn--ghost btn--small" disabled={busy || current === 'needs_review'} onClick={() => apply('reset')}>Back to needs review</button>
    </div>
  );
}
