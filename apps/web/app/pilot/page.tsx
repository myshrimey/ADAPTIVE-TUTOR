import { createServerClient } from '@/lib/supabase-server';
import { FOUNDER, PILOT_OFFER, t } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { PilotPaymentForm } from '@/components/PilotPaymentForm';

export default async function PilotOfferPage() {
  const lang = await getServerLang();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div className="hero-banner" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">{t('pilot.title', lang)}</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>
            {t('pilot.price', lang, { amount: PILOT_OFFER.priceInr, days: PILOT_OFFER.days })}
          </h1>
          <p className="hero__lede">{t('pilot.noAutoRenew', lang)} {t('pilot.noGuarantee', lang)}</p>
        </div>

        <section style={{ marginTop: 'var(--space-4)' }}>
          <p>{t('pilot.contactForPayment', lang)}</p>
          <p style={{ fontWeight: 600 }}>{t('pilot.contactPhone', lang, { phone: FOUNDER.contactPhone })}</p>
        </section>

        <section style={{ marginTop: 'var(--space-4)' }}>
          {user ? (
            <PilotPaymentForm priceInr={PILOT_OFFER.priceInr} />
          ) : (
            <p>
              <a href="/">{t('auth.signIn', lang)}</a> {lang === 'hi' ? 'सबसे पहले भुगतान सबमिट करने के लिए।' : 'first, to submit a payment confirmation.'}
            </p>
          )}
        </section>

        <section style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--slate)' }}>
          <a href="/legal/pilot-limitations">{t('legal.pilotLimitations', lang)}</a>
          {' · '}
          <a href="/legal/payment-policy">{t('legal.paymentPolicy', lang)}</a>
        </section>
      </div>
    </main>
  );
}
