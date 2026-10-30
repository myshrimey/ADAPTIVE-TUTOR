'use client';
import { useEffect, useState } from 'react';

// What happened to the things I reported. Only my own reports; plain words.
type Item = { date: string; message: string; label: string; note: string };
export default function MyFeedbackPage() {
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState('');
  useEffect(() => { fetch('/api/feedback/mine').then(async (r) => { const j = await r.json().catch(() => ({})); if (r.status === 401) setErr('Please sign in to see your reports.'); else if (j.error) setErr('Could not load your reports. Please try again.'); else setItems(j.data ?? []); }).catch(() => setErr('Could not load your reports. Please try again.')); }, []);
  return (
    <main className="page"><div className="shell" style={{ maxWidth: 640, paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-3)' }}>My reports</h1>
      <p style={{ color: 'var(--slate)' }}>Thank you for telling us. Here is what happened to what you sent.</p>
      {err && <p role="alert">{err}</p>}
      {items && items.length === 0 && <p>You have not sent a report yet. Use the Feedback button on any page.</p>}
      {items?.map((it, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--line)', padding: '0.6rem 0' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{it.date}</div>
          <div>&ldquo;{it.message}&rdquo;</div>
          <div style={{ marginTop: 4 }}><strong>{it.label}.</strong> {it.note}</div>
        </div>
      ))}
    </div></main>
  );
}
