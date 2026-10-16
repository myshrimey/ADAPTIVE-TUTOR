// The paid plans (founder, 2026-10-15). One place for prices and rules; the offer
// page, FAQ, admin form and access checks all read from here.
//
//  per_subject_monthly : Rs 300 per subject per month
//  five_monthly        : Rs 999 per month for up to 5 subjects, billed monthly, plan ends Feb 2027
//  five_till_march     : Rs 4500 one time for up to 5 subjects, access till 31 Mar 2027
//
// Access is granted by the founder per student (student_access): a plan, how many
// subjects, and an end date. For the monthly plans the end date is the end of the
// month that has been paid for; `lastDate` is the latest date the plan can ever run to.

export type PlanCode = 'per_subject_monthly' | 'five_monthly' | 'five_till_march';
export type AccessPlanCode = PlanCode | 'grandfathered' | 'custom';

export interface PlanInfo {
  code: PlanCode;
  priceInr: number;
  /** How the price is charged. */
  billing: 'per_subject_per_month' | 'per_month' | 'one_time';
  /** Subjects included (null = chosen by the founder when granting, e.g. 1, 2, 3). */
  subjects: number | null;
  /** Latest possible access date (YYYY-MM-DD), or null for no fixed end. */
  lastDate: string | null;
}

export const PLANS: Record<PlanCode, PlanInfo> = {
  per_subject_monthly: { code: 'per_subject_monthly', priceInr: 300, billing: 'per_subject_per_month', subjects: null, lastDate: null },
  five_monthly: { code: 'five_monthly', priceInr: 999, billing: 'per_month', subjects: 5, lastDate: '2027-02-28' },
  five_till_march: { code: 'five_till_march', priceInr: 4500, billing: 'one_time', subjects: 5, lastDate: '2027-03-31' },
};

export const PLAN_LABELS: Record<PlanCode, string> = {
  per_subject_monthly: 'Sahayak — Rs 300 per subject per month',
  five_monthly: 'Sahayak — Rs 999 per month, 5 subjects (till Feb 2027)',
  five_till_march: 'Sahayak — Rs 4500 one time, 5 subjects (till Mar 2027)',
};

export const PLAN_CODES = Object.keys(PLANS) as PlanCode[];
export const ACCESS_PLAN_CODES: AccessPlanCode[] = [...PLAN_CODES, 'grandfathered', 'custom'];

export function isPlanCode(v: unknown): v is PlanCode {
  return typeof v === 'string' && (PLAN_CODES as string[]).includes(v);
}

/** The plan's end date can never be later than its lastDate. Returns an error code or null. */
export function validateAccessUntil(plan: AccessPlanCode, accessUntil: string | null): string | null {
  if (accessUntil !== null && !/^\d{4}-\d{2}-\d{2}$/.test(accessUntil)) return 'invalid_date';
  if (plan === 'grandfathered' || plan === 'custom') return null;
  const info = PLANS[plan];
  if (info.lastDate && accessUntil && accessUntil > info.lastDate) return 'date_after_plan_end';
  if (info.lastDate && !accessUntil) return 'date_required';
  if (plan === 'per_subject_monthly' && !accessUntil) return 'date_required';
  return null;
}

/** A sensible default end date to pre-fill when the founder grants this plan today. */
export function defaultAccessUntil(plan: AccessPlanCode, today: Date = new Date()): string | null {
  if (plan === 'five_till_march') return PLANS.five_till_march.lastDate;
  if (plan === 'grandfathered' || plan === 'custom') return null;
  const d = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
  const iso = d.toISOString().slice(0, 10);
  const last = PLANS[plan].lastDate;
  return last && iso > last ? last : iso;
}
