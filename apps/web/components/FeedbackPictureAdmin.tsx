'use client';
import { useState } from 'react';

// Shows one private feedback picture to an admin and lets them delete it.
export function FeedbackPictureAdmin({ id }: { id: string }) {
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (gone) return null;
  async function del() {
    if (busy || !window.confirm('Delete this picture? This cannot be undone.')) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/feedback/attachment', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (r.ok) setGone(true); else setErr('Could not delete.');
    } catch { setErr('Could not delete.'); }
    setBusy(false);
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, marginRight: 8 }}>
      <a href={`/api/admin/feedback/attachment?id=${id}`} target="_blank" rel="noreferrer">
        <img src={`/api/admin/feedback/attachment?id=${id}`} alt="Picture sent with this feedback" loading="lazy"
          style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
      </a>
      <button type="button" className="btn btn--ghost" style={{ minHeight: 48 }} onClick={del} disabled={busy}>Delete picture</button>
      {err && <span className="alert">{err}</span>}
    </span>
  );
}
