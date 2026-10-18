// The plans (founder). One place for prices and rules; the home page, offer page, FAQ,
// admin form and access checks all read from here.
//
//  free                : Rs 0. One subject, free-tier AI only, a small daily limit of AI tutor replies.
//  per_subject_monthly : Rs 1000 per subject per month
//  five_monthly        : Rs 3300 per month for up to 5 subjects, billed monthly, plan ends Feb 2027
//  five_till_march     : Rs 14999 one time for up to 5 subjects, access till 28 Feb 2027 (sold as a Founding Family plan since v43)
//  founding_family     : Rs 4999 one time for up to 5 subjects, access till 31 Mar 2027 (Founding Family Programme)
//  Since v43 only Free, founding_family and five_till_march are on sale (`onSale`).
//
// Prices were re-set on 2026-10-16 (v37): the founder moved the per-subject price from
// Rs 300 to Rs 1000, and the other two were scaled by the same ratio as before
// (five-subject monthly = 2/3 of five single subjects; the one-time plan = 4.5 months of it),
// rounded to Rs 3300 and Rs 15000. They are PROPOSED numbers for the founder to confirm.
//
// Access is granted by the founder per student (student_access): a plan, how many
// subjects, and an end date. For the monthly plans the end date is the end of the
// month that has been paid for; `lastDate` is the latest date the plan can ever run to.

export type PlanCode = 'per_subject_monthly' | 'five_monthly' | 'five_till_march' | 'founding_family';
export type AccessPlanCode = PlanCode | 'free' | 'grandfathered' | 'custom';

export interface PlanInfo {
  code: PlanCode;
  priceInr: number;
  /** Offered to new families? false = no longer sold (students already on it keep access). */
  onSale: boolean;
  /** How the price is charged. */
  billing: 'per_subject_per_month' | 'per_month' | 'one_time';
  /** Subjects included (null = chosen by the founder when granting, e.g. 1, 2, 3). */
  subjects: number | null;
  /** Latest possible access date (YYYY-MM-DD), or null for no fixed end. */
  lastDate: string | null;
}

export const PLANS: Record<PlanCode, PlanInfo> = {
  per_subject_monthly: { code: 'per_subject_monthly', priceInr: 1000, billing: 'per_subject_per_month', subjects: null, lastDate: null, onSale: false },
  five_monthly: { code: 'five_monthly', priceInr: 3300, billing: 'per_month', subjects: 5, lastDate: '2027-02-28', onSale: false },
  five_till_march: { code: 'five_till_march', priceInr: 14999, billing: 'one_time', subjects: 5, lastDate: '2027-02-28', onSale: true },
  // Founding Family Programme (v42, master prompt v3 sec. 7). A TEST price, not a permanent one:
  // change priceInr / seatCap / enabled here and every page, form and check follows.
  founding_family: { code: 'founding_family', priceInr: 4999, billing: 'one_time', subjects: 5, lastDate: '2027-03-31', onSale: true },
};

/**
 * Founding Family Programme settings. `enabled: false` hides the plan card everywhere (existing
 * founding families keep their access). `seatCap` is a real cap: the offer page shows seats
 * taken from student_access and says "full" when the cap is reached - no fake scarcity.
 */
export const FOUNDING_FAMILY = { enabled: true, seatCap: 50, planCode: 'founding_family' as const };

export const PLAN_LABELS: Record<PlanCode, string> = {
  per_subject_monthly: `Sahayak — Rs ${PLANS.per_subject_monthly.priceInr} per subject per month`,
  five_monthly: `Sahayak — Rs ${PLANS.five_monthly.priceInr} per month, 5 subjects (till Feb 2027)`,
  five_till_march: `Sahayak Founding Family — Rs ${PLANS.five_till_march.priceInr} one time, 5 subjects (till Feb 2027)`,
  founding_family: `Sahayak Founding Family Programme — Rs ${PLANS.founding_family.priceInr} one time, 5 subjects (till Mar 2027)`,
};

export const PLAN_CODES = Object.keys(PLANS) as PlanCode[];
/** Plans offered to new families (v43: the founder switched the monthly plans off; students already on them keep access). */
export const SALE_PLAN_CODES = PLAN_CODES.filter((c) => PLANS[c].onSale);
export const ACCESS_PLAN_CODES: AccessPlanCode[] = ['free', ...PLAN_CODES, 'grandfathered', 'custom'];

export function isPlanCode(v: unknown): v is PlanCode {
  return typeof v === 'string' && (PLAN_CODES as string[]).includes(v);
}

// ---- What each kind of access allows -----------------------------------------------------

/** AI tutor replies per day. Free = small; paid = generous fair-use limit that protects cost. */
export const FREE_TUTOR_REPLIES_PER_DAY = 10;
export const PAID_TUTOR_REPLIES_PER_DAY = 100;
export const FREE_SUBJECT_LIMIT = 1;

export type AITier = 'free' | 'paid';

/** Free students use free-tier AI models only. Everyone else may also use the backup paid models. */
export function aiTierForPlan(planCode: string | null | undefined): AITier {
  return planCode === 'free' || !planCode ? 'free' : 'paid';
}

export function tutorRepliesPerDay(planCode: string | null | undefined): number {
  return aiTierForPlan(planCode) === 'free' ? FREE_TUTOR_REPLIES_PER_DAY : PAID_TUTOR_REPLIES_PER_DAY;
}

export type PlanFeature = 'mock_exams';

/** Features that need a paid plan. Practice, quizzes, diagnostic and the report stay free. */
export function planAllows(planCode: string | null | undefined, feature: PlanFeature): boolean {
  void feature;
  return aiTierForPlan(planCode) === 'paid';
}

/** Dictionary keys (packages/core/i18n/dictionary.ts) for the bullet list under each plan card. */
export type PricingCardId = 'free' | PlanCode;
export const PLAN_FEATURE_KEYS: Record<PricingCardId, string[]> = {
  free: ['plans.f.oneSubject', 'plans.f.diagnostic', 'plans.f.quizzes', 'plans.f.aiLimited', 'plans.f.report', 'plans.f.papers'],
  per_subject_monthly: ['plans.f.chooseSubjects', 'plans.f.aiFull', 'plans.f.adaptive', 'plans.f.mocks', 'plans.f.readiness', 'plans.f.checkins', 'plans.f.report'],
  five_monthly: ['plans.f.fiveSubjects', 'plans.f.everythingPaid', 'plans.f.monthToMonth', 'plans.f.tillFeb'],
  five_till_march: ['plans.f.fiveSubjects', 'plans.f.everythingPaid', 'plans.f.onePayment', 'plans.f.tillFebFounding', 'plans.f.foundingCohort'],
  founding_family: ['plans.f.fiveSubjects', 'plans.f.everythingPaid', 'plans.f.onePayment', 'plans.f.tillMarch', 'plans.f.foundingCohort'],
};

/** The plan's end date can never be later than its lastDate. Returns an error code or null. */
export function validateAccessUntil(plan: AccessPlanCode, accessUntil: string | null): string | null {
  if (accessUntil !== null && !/^\d{4}-\d{2}-\d{2}$/.test(accessUntil)) return 'invalid_date';
  if (plan === 'grandfathered' || plan === 'custom' || plan === 'free') return null;
  const info = PLANS[plan];
  if (info.lastDate && accessUntil && accessUntil > info.lastDate) return 'date_after_plan_end';
  if (info.lastDate && !accessUntil) return 'date_required';
  if (plan === 'per_subject_monthly' && !accessUntil) return 'date_required';
  return null;
}

/** A sensible default end date to pre-fill when the founder grants this plan today. */
export function defaultAccessUntil(plan: AccessPlanCode, today: Date = new Date()): string | null {
  if (plan === 'five_till_march' || plan === 'founding_family') return PLANS[plan].lastDate;
  if (plan === 'grandfathered' || plan === 'custom' || plan === 'free') return null;
  const d = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
  const iso = d.toISOString().slice(0, 10);
  const last = PLANS[plan].lastDate;
  return last && iso > last ? last : iso;
}

/** Seats left in the founding cohort (never below 0). */
export function foundingSeatsLeft(taken: number): number {
  return Math.max(0, FOUNDING_FAMILY.seatCap - taken);
}
