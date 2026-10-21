'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminPaymentActions({ paymentId, status = 'pending', activatable = false, activateOnly = false }: { paymentId: string; status?: 'pending' | 'confirmed'; activatable?: boolean; activateOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState('');
  async function act(action: 'confirm' | 'reject' | 'refund' | 'activate') {
    setBusy(true); setErr('');
    const res = await fetch(`/api/admin/payments/${paymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).then((r) => r.json()).catch(() => ({ error: 'network' }));
    if (res?.error) setErr(res.error);
    setBusy(false);
    router.refresh();
  }

  if (status === 'confirmed') {
    // Revoking access: marks the payment refunded (money is returned by the founder outside the app).
    return (
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Mark this payment as refunded and end access? Do the actual refund in your UPI app yourself.')) act('refund');
          }}
        >
          Mark refunded / revoke access
        </button>
      </div>
    );
  }

  if (activateOnly) return <div style={{ marginTop: '0.4rem' }}><button type="button" className="btn btn--accent" disabled={busy} onClick={() => act('activate')}>Activate what was bought</button>{err && <span className="alert"> {err}</span>}</div>;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
      {activatable && <button type="button" className="btn btn--accent" disabled={busy} onClick={() => act('activate')}>Verify payment and activate</button>}
      <button type="button" className={activatable ? 'btn btn--ghost' : 'btn btn--accent'} disabled={busy} onClick={() => act('confirm')}>
        {activatable ? 'Only record as paid (do not activate)' : 'Confirm payment'}
      </button>
      <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => act('reject')}>
        Reject
      </button>
      {err && <span className="alert">{err}</span>}
    </div>
  );
}
