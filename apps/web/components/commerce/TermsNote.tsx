import { TERMS_LINE, PRICE_REVISION_LINE, NO_GUARANTEE_LINE } from '@adaptive-tutor/core';

/** The wording that must appear on every pricing card (short) and every pricing page (full). */
export function CardTerms() {
  return <p style={{ fontSize: '0.8rem', color: 'var(--slate)', margin: '0.5rem 0 0' }}><a href="/legal/terms">{TERMS_LINE}</a></p>;
}
export function PageTerms() {
  return (
    <section style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--slate)' }}>
      <p><strong>{TERMS_LINE}</strong> {PRICE_REVISION_LINE}</p>
      <p>{NO_GUARANTEE_LINE}</p>
      <p>Founding access is currently activated manually after payment verification. <a href="/legal/terms">Terms</a> · <a href="/legal/privacy">Privacy</a> · <a href="/legal/payment-policy">Refund and cancellation</a> · <a href="/contact">Contact</a> · <a href="/about">About Sahayak</a></p>
    </section>
  );
}
