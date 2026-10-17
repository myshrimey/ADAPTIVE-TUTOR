'use client';

import { useState } from 'react';

export function AdminReviewActions({ table, itemId, status, marks, level, sugMarks, sugLevel }: { table: string; itemId: string; status: string; marks?: number | null; level?: string | null; sugMarks?: number | null; sugLevel?: string | null }) {
  const [m, setM] = useState(String(sugMarks ?? marks ?? ''));
  const [lv, setLv] = useState(sugLevel ?? level ?? '');
  const [saved, setSaved] = useState(false);
  async function saveDetails() {
    setBusy(true);
    const res = await fetch('/api/admin/reviews/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, itemId, action: 'set_details', marks: m, cognitiveLevel: lv }) });
    const json = await res.json();
    setBusy(false);
    setSaved(!json.error);
  }
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  async function apply(action: 'verify' | 'reject' | 'reset') {
    setBusy(true);
    const res = await fetch('/api/admin/reviews/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, itemId, action }) });
    const json = await res.json();
    setBusy(false);
    if (!json.error && json.data.status) setCurrent(json.data.status);
  }
  return (
    <div className="hero__actions" style={{ marginTop: '0.4rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.85rem' }}>Status now: <strong>{current}</strong></span>
      <button className="btn btn--accent btn--small" disabled={busy || current === 'verified'} onClick={() => apply('verify')}>Mark verified</button>
      <button className="btn btn--ghost btn--small" disabled={busy || current === 'rejected'} onClick={() => apply('reject')}>Reject (stop showing)</button>
      <button className="btn btn--ghost btn--small" disabled={busy || current === 'needs_review'} onClick={() => apply('reset')}>Back to needs review</button>
      <span style={{ fontSize: '0.85rem' }}>
        Marks <input className="field__input" style={{ width: 60, display: 'inline-block' }} type="number" min={1} max={20} value={m} onChange={(e) => { setM(e.target.value); setSaved(false); }} />{' '}
        Level <select className="field__input" style={{ width: 130, display: 'inline-block' }} value={lv} onChange={(e) => { setLv(e.target.value); setSaved(false); }}>
          <option value="">not set</option><option value="recall">recall</option><option value="understand">understand</option><option value="apply">apply</option><option value="analyse">analyse</option>
        </select>{' '}
        <button className="btn btn--ghost btn--small" disabled={busy} onClick={saveDetails}>Save marks and level</button>{saved ? ' ✓ saved' : ''}
      </span>
    </div>
  );
}
