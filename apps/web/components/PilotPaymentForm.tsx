'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageProvider';

interface Claim {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected';
  amount: number;
  paymentDate: string;
  pilotStartDate: string | null;
  pilotEndDate: string | null;
}

export function PilotPaymentForm({ priceInr }: { priceInr: number }) {
  const { t } = useLanguage();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [amount, setAmount] = useState(String(priceInr));
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/pilot/payment')
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) setClaims(json.data);
      })
      .catch(() => {});
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch('/api/pilot/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount), paymentDate, transactionReference: reference || undefined }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    setSubmitted(true);
  }

  const latestConfirmed = claims?.find((c) => c.status === 'confirmed');
  const latestPending = claims?.find((c) => c.status === 'pending');

  if (latestConfirmed) {
    return (
      <div className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{t('payment.confirmedNotice')}</p>
        <p style={{ margin: '0.3rem 0 0' }}>
          {t('payment.accessStart')}: {latestConfirmed.pilotStartDate} · {t('payment.accessEnd')}: {latestConfirmed.pilotEndDate}
        </p>
      </div>
    );
  }

  if (latestPending) {
    return (
      <div className="alert">
        <p style={{ margin: 0 }}>{t('payment.pendingNotice')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
      <h3 style={{ fontSize: 'var(--step-1)' }}>{t('payment.formTitle')}</h3>
      {error && <p className="alert">{error}</p>}
      <div className="field">
        <label className="field__label" htmlFor="amount">
          {t('payment.amountPaid')}
        </label>
        <input id="amount" className="field__input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="paymentDate">
          {t('payment.dateOfPayment')}
        </label>
        <input id="paymentDate" className="field__input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="reference">
          {t('payment.referenceLabel')}
        </label>
        <input id="reference" className="field__input" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <button type="submit" className="btn btn--accent" disabled={submitting}>
        {submitting ? t('common.saving') : t('payment.submit')}
      </button>
    </form>
  );
}
