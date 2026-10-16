import { getFaq, t, type Lang } from '@adaptive-tutor/core';

// Native <details>/<summary>: keyboard accessible and works with no JavaScript.
export function FaqSection({ lang }: { lang: Lang }) {
  const items = getFaq(lang);
  return (
    <section className="faq" aria-labelledby="faq-title" style={{ marginTop: 'var(--space-4)' }}>
      <h2 id="faq-title" style={{ fontSize: 'var(--step-1)' }}>
        {t('faq.title', lang)}
      </h2>
      {items.map((it) => (
        <details key={it.q} className="faq__item">
          <summary className="faq__q">{it.q}</summary>
          <p className="faq__a">{it.a}</p>
        </details>
      ))}
      <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
        <a href="/legal/privacy">{t('legal.privacy', lang)}</a> · <a href="/legal/payment-policy">{t('legal.paymentPolicy', lang)}</a> ·{' '}
        <a href="/legal/pilot-limitations">{t('legal.pilotLimitations', lang)}</a>
      </p>
    </section>
  );
}
