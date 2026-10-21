'use client';
import { useEffect, useState } from 'react';

// One short, optional question: "If this were paid at ₹X, would you consider it?" Shown at most twice per person, one per feature.
export function WtpPrompt({ feature, title }: { feature: string; title: string }) {
  const [price, setPrice] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => { fetch(`/api/commerce/wtp?feature=${encodeURIComponent(feature)}`).then((r) => r.json()).then((j) => j.data && setPrice(j.data.price)).catch(() => {}); }, [feature]);
  if (price === null) return null;
  if (done) return <p style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>Thank you, that helps us decide what to build.</p>;
  async function answer(a: 'yes' | 'maybe' | 'no') {
    setDone(true);
    fetch('/api/commerce/wtp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature, answer: a }) }).catch(() => {});
  }
  return (
    <div className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '0.92rem' }}>If this were a paid feature at ₹{price.toLocaleString('en-IN')}, would you consider buying it? (Optional. Nothing is charged.)</div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
        <button className="btn btn--small" onClick={() => answer('yes')}>Yes</button>
        <button className="btn btn--ghost btn--small" onClick={() => answer('maybe')}>Maybe</button>
        <button className="btn btn--ghost btn--small" onClick={() => answer('no')}>No</button>
        <button className="btn btn--ghost btn--small" onClick={() => setPrice(null)}>Not now</button>
      </div>
    </div>
  );
}
