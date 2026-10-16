'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminPaymentActions({ paymentId, status = 'pending' }: { paymentId: string; status?: 'pending' | 'confirmed' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: 'confirm' | 'reject' | 'refund') {
    setBusy(true);
    await fetch(`/api/admin/payments/${paymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
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

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
      <button type="button" className="btn btn--accent" disabled={busy} onClick={() => act('confirm')}>
        Confirm payment
      </button>
      <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => act('reject')}>
        Reject
      </button>
    </div>
  );
}
