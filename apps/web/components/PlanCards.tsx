import { FOUNDING_FAMILY, foundingSeatsLeft, PLANS, PLAN_FEATURE_KEYS, FREE_TUTOR_REPLIES_PER_DAY, PAID_TUTOR_REPLIES_PER_DAY, t, type Lang, type PricingCardId } from '@adaptive-tutor/core';

// The four plan cards (Free + the three paid plans) with what each one includes. Prices and
// limits are read from packages/core/plans/plans.ts, so this can never disagree with what the
// app actually enforces. Used on the home page and on the offer page.
const CARDS: { id: PricingCardId; nameKey: string; descKey: string; unitKey: string; badge?: 'start' | 'best' | 'founding' }[] = [
  { id: 'free', nameKey: 'plans.free.name', descKey: 'plans.free.desc', unitKey: 'plans.unit.free', badge: 'start' },
  ...(FOUNDING_FAMILY.enabled
    ? [{ id: 'founding_family' as PricingCardId, nameKey: 'plans.founding.name', descKey: 'plans.founding.desc', unitKey: 'plans.unit.oneTime', badge: 'founding' as const }]
    : []),
  { id: 'five_till_march', nameKey: 'plans.fiveMarch.name', descKey: 'plans.fiveMarch.desc', unitKey: 'plans.unit.oneTime', badge: 'founding' },
];

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function PlanCards({ lang, showCta = true, foundingSeatsTaken = null }: { lang: Lang; showCta?: boolean; foundingSeatsTaken?: number | null }) {
  return (
    <div>
      <div className="plan-grid">
        {CARDS.map((c) => {
          const isFree = c.id === 'free';
          const price = isFree ? '₹0' : inr(PLANS[c.id as keyof typeof PLANS].priceInr);
          return (
            <div key={c.id} className={`plan-card${c.badge === 'best' || c.badge === 'founding' ? ' plan-card--featured' : ''}`}>
              {c.badge && <span className="plan-card__badge">{t(`plans.badge.${c.badge}` as any, lang)}</span>}
              <h3 className="plan-card__name">{t(c.nameKey as any, lang)}</h3>
              <div className="plan-card__price">
                {price} <span className="plan-card__unit">{t(c.unitKey as any, lang)}</span>
              </div>
              <p className="plan-card__desc">{t(c.descKey as any, lang)}</p>
              {c.id === 'founding_family' && foundingSeatsTaken !== null && (
                <p className="plan-card__desc" style={{ fontWeight: 600 }}>
                  {foundingSeatsLeft(foundingSeatsTaken) > 0
                    ? `${foundingSeatsTaken} of ${FOUNDING_FAMILY.seatCap} families joined. ${foundingSeatsLeft(foundingSeatsTaken)} places left.`
                    : `All ${FOUNDING_FAMILY.seatCap} places are taken. Contact us to join the waiting list.`}
                </p>
              )}
              <ul className="plan-card__features">
                {PLAN_FEATURE_KEYS[c.id].map((k) => (
                  <li key={k}>
                    {t(k as any, lang, { n: isFree ? FREE_TUTOR_REPLIES_PER_DAY : PAID_TUTOR_REPLIES_PER_DAY })}
                  </li>
                ))}
              </ul>
              {showCta && (
                <a className={`btn ${c.badge === 'best' ? 'btn--accent' : 'btn--ghost'}`} href="/contact">
                  {t((isFree ? 'plans.cta.free' : 'plans.cta.paid') as any, lang)}
                </a>
              )}
            </div>
          );
        })}
      </div>
      <p className="plan-note">{t('plans.maths', lang)} {t('plans.home.note', lang)}</p>
      <p className="plan-note">{t('plans.fairUse', lang)}</p>
    </div>
  );
}
