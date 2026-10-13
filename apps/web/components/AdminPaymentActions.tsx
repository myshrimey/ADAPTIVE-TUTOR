'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminPaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: 'confirm' | 'reject') {
    setBusy(true);
    await fetch(`/api/admin/payments/${paymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    router.refresh();
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
