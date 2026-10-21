'use client';
import { useEffect, useState } from 'react';

// Shows a signed-in student their plan, handwritten-evaluation credits and purchase requests.
export function PlanStatus() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch('/api/commerce/me').then((r) => r.json()).then((j) => j.data && setD(j.data)).catch(() => {}); }, []);
  if (!d) return null;
  const a = d.access;
  const planText = a.status === 'active' ? (a.planCode === 'free' ? 'Free plan' : `Paid plan${a.accessUntil ? ` until ${a.accessUntil}` : ''}`) : a.status === 'expired' ? `Your plan ended on ${a.accessUntil}` : 'No plan yet';
  const pending = (d.payments ?? []).filter((p: any) => p.status === 'pending');
  return (
    <div className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
      <strong>Your account</strong>
      <div>{planText} · Handwritten evaluation credits: <strong>{d.credits}</strong></div>
      {pending.map((p: any) => <div key={p.id} style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Waiting for payment check: {p.offer_label} (₹{p.amount})</div>)}
    </div>
  );
}
