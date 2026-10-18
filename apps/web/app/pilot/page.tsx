import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { FOUNDER, FOUNDING_FAMILY, PLANS, t } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { PilotPaymentForm } from '@/components/PilotPaymentForm';
import { FaqSection } from '@/components/FaqSection';
import { PlanCards } from '@/components/PlanCards';

// The ₹999 "Sahayak Complete Board Preparation" offer page (master prompt
// sec. 29): states duration, supported subjects (with honest status), what is
// and isn't included, and the support/refund pointers. Route stays /pilot so
// existing links keep working.
export default async function BoardPrepOfferPage() {
  const lang = await getServerLang();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public, non-sensitive catalogue read (subject names + readiness status) so a
  // parent who isn't signed in yet can still see what is and isn't supported.
  // Service client is used only for this fixed read — no client-supplied input.
  const { data: subjects } = await createServiceClient()
    .from('subjects')
    .select('id, name, slug, status')
    .order('name');
  const { count: foundingTaken } = await createServiceClient()
    .from('student_access')
    .select('student_id', { count: 'exact', head: true })
    .in('plan_code', [FOUNDING_FAMILY.planCode, 'five_till_march']); // both Founding Family plans share the 50 places
  const order = ['ready', 'pilot', 'in_development', 'coming_soon'];
  const sorted = (subjects ?? []).slice().sort((a: any, b: any) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <main className="page">
      <div className="shell">
        <div className="hero-banner" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">{t('pilot.title', lang)} · CBSE Class 10 · 2027</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{t('plans.title', lang)}</h1>
          <p className="hero__lede">{t('plans.lede', lang)}</p>
        </div>

        <section style={{ marginTop: 'var(--space-3)' }}>
          <PlanCards lang={lang} foundingSeatsTaken={FOUNDING_FAMILY.enabled ? foundingTaken ?? 0 : null} />
        </section>

        <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{t('pilot.includesTitle', lang)}</h2>
          <ul>
            <li>{t('pilot.inc1', lang)}</li>
            <li>{t('pilot.inc2', lang)}</li>
            <li>{t('pilot.inc3', lang)}</li>
            <li>{t('pilot.inc4', lang)}</li>
          </ul>
        </section>

        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{t('pilot.subjectsTitle', lang)}</h2>
          <div className="subject-chip-row">
            {sorted.map((s: any) => (
              <span key={s.id} className="subject-chip">
                <span className="subject-chip__name">{s.name}</span>
                <span className="subject-chip__score">{t(`subject.status.${s.status}` as any, lang)}</span>
              </span>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{t('pilot.notIncludedTitle', lang)}</h2>
          <ul>
            <li>{t('pilot.not1', lang)}</li>
            <li>{t('pilot.not2', lang)}</li>
            <li>{t('pilot.not3', lang)}</li>
            <li>{t('pilot.not4', lang)}</li>
          </ul>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>
            {t('pilot.noAutoRenew', lang)} {t('pilot.priceNote', lang)} {t('pilot.refundNote', lang)}
          </p>
        </section>

        <section style={{ marginTop: 'var(--space-4)' }}>
          <p>{t('pilot.contactForPayment', lang)}</p>
          <p style={{ fontWeight: 600 }}>{t('pilot.contactPhone', lang, { phone: FOUNDER.contactPhone })}</p>
        </section>

        <section style={{ marginTop: 'var(--space-4)' }}>
          {user ? (
            <PilotPaymentForm priceInr={PLANS.founding_family.priceInr} />
          ) : (
            <p>
              <a href="/">{t('auth.signIn', lang)}</a> {lang === 'hi' ? 'सबसे पहले भुगतान सबमिट करने के लिए।' : 'first, to submit a payment confirmation.'}
            </p>
          )}
        </section>

        <FaqSection lang={lang} />

        <section style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--slate)' }}>
          <a href="/legal/pilot-limitations">{t('legal.pilotLimitations', lang)}</a>
          {' · '}
          <a href="/legal/payment-policy">{t('legal.paymentPolicy', lang)}</a>
        </section>
      </div>
    </main>
  );
}
