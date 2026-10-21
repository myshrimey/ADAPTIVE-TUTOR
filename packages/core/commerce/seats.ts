import type { SupabaseClient } from '@supabase/supabase-js';
import { loadProduct, loadSettings, applyCredit, recordCommerceEvent } from './commerce.service';

// Tutor / centre plans: a seat limit and a shared pool of handwritten-mock credits.
// A plan is switched on by the founder (admin) after he has checked the payment. Seats are only ENFORCED when the
// founder turns settings.seats.enforce on; until then tutors and centres behave exactly as before.

const today = () => new Date().toISOString().slice(0, 10);

export interface OrgPlan { userId: string; productCode: string; studentLimit: number; creditsPerMonth: number; accessUntil: string | null; status: string }

export async function getOrgPlan(service: SupabaseClient, userId: string): Promise<OrgPlan | null> {
  const { data } = await service.from('org_plans').select('*').eq('user_id', userId).maybeSingle();
  return data ? { userId: data.user_id, productCode: data.product_code, studentLimit: data.student_limit, creditsPerMonth: data.credits_per_month ?? 0, accessUntil: data.access_until ?? null, status: data.status } : null;
}

export function orgPlanActive(p: OrgPlan | null, on: string = today()): boolean {
  return !!p && p.status === 'active' && (!p.accessUntil || p.accessUntil >= on);
}

export async function activeSeatCount(service: SupabaseClient, adultUserId: string): Promise<number> {
  const { data } = await service.from('student_links').select('student_id').eq('adult_user_id', adultUserId).eq('status', 'active');
  return (data ?? []).length;
}

export type SeatReason = 'ok' | 'no_plan' | 'plan_expired' | 'seat_limit';
/** Can this tutor/centre link ANOTHER student? Re-linking a student who is already linked never needs a new seat. */
export async function seatCheck(service: SupabaseClient, adultUserId: string, studentId?: string): Promise<{ ok: boolean; reason: SeatReason; used: number; limit: number | null; enforced: boolean }> {
  const settings = await loadSettings(service);
  const used = await activeSeatCount(service, adultUserId);
  if (!settings.seats.enforce) return { ok: true, reason: 'ok', used, limit: null, enforced: false };
  if (studentId) {
    const { data } = await service.from('student_links').select('id').eq('adult_user_id', adultUserId).eq('student_id', studentId).eq('status', 'active').maybeSingle();
    if (data) return { ok: true, reason: 'ok', used, limit: null, enforced: true };
  }
  const plan = await getOrgPlan(service, adultUserId);
  if (!plan) return { ok: false, reason: 'no_plan', used, limit: 0, enforced: true };
  if (!orgPlanActive(plan)) return { ok: false, reason: 'plan_expired', used, limit: plan.studentLimit, enforced: true };
  if (used >= plan.studentLimit) return { ok: false, reason: 'seat_limit', used, limit: plan.studentLimit, enforced: true };
  return { ok: true, reason: 'ok', used, limit: plan.studentLimit, enforced: true };
}

export async function orgBalance(service: SupabaseClient, userId: string): Promise<number> {
  const { data } = await service.from('org_credit_ledger').select('delta').eq('user_id', userId);
  return (data ?? []).reduce((a: number, r: any) => a + (r.delta ?? 0), 0);
}

async function orgCredit(service: SupabaseClient, userId: string, delta: number, reason: string, ref: string): Promise<boolean> {
  const { data: existing } = await service.from('org_credit_ledger').select('id').eq('user_id', userId).eq('ref', ref).maybeSingle();
  if (existing) return false;
  const { error } = await service.from('org_credit_ledger').insert({ user_id: userId, delta, reason, ref });
  if (error) { if (/duplicate|unique/i.test(error.message)) return false; throw error; }
  return true;
}

/** Monthly pool credits for the months the plan has been running. Idempotent (one row per month). */
export async function ensureOrgMonthlyCredits(service: SupabaseClient, userId: string, on: string = today()): Promise<number> {
  const plan = await getOrgPlan(service, userId);
  if (!plan || plan.status !== 'active' || plan.creditsPerMonth <= 0) return 0;
  const key = on.slice(0, 7);
  if (plan.accessUntil && plan.accessUntil < on) return 0;
  return (await orgCredit(service, userId, plan.creditsPerMonth, `Monthly credits ${key}`, `monthly:${key}`)) ? plan.creditsPerMonth : 0;
}

/** Admin only. Switches on (or renews by one month) a tutor/centre plan. Safe to press twice for the same payment/application via `ref`. */
export async function activateOrgPlan(service: SupabaseClient, userId: string, productCode: string, adminEmail: string, ref: string, now: Date = new Date()): Promise<{ accessUntil: string }> {
  const product = await loadProduct(service, productCode);
  if (!product || (product.kind !== 'tutor' && product.kind !== 'centre')) throw new Error('not_a_tutor_or_centre_plan');
  const { data: u } = await service.from('users').select('role').eq('id', userId).maybeSingle();
  if (!u || (u.role !== 'tutor' && u.role !== 'centre')) throw new Error('user_is_not_tutor_or_centre');
  if (u.role !== product.kind) throw new Error('plan_does_not_match_account_type');
  const cur = await getOrgPlan(service, userId);
  // Renewal: extend from the current end if it is still in the future, otherwise from today. Same ref = no double extension.
  const { data: done } = await service.from('org_credit_ledger').select('id').eq('user_id', userId).eq('ref', `activate:${ref}`).maybeSingle();
  let accessUntil = cur?.accessUntil ?? null;
  if (!done) {
    const base = cur?.accessUntil && cur.accessUntil > now.toISOString().slice(0, 10) ? new Date(cur.accessUntil + 'T00:00:00Z') : now;
    accessUntil = new Date(base.getTime() + 31 * 86400000).toISOString().slice(0, 10);
    await orgCredit(service, userId, 0, `Plan activated: ${product.name}`, `activate:${ref}`);
  }
  const { error } = await service.from('org_plans').upsert({
    user_id: userId, product_code: product.code, student_limit: product.studentLimit ?? 0, credits_per_month: product.creditsPerMonth,
    access_until: accessUntil, status: 'active', activated_by: adminEmail, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  await ensureOrgMonthlyCredits(service, userId, now.toISOString().slice(0, 10));
  await recordCommerceEvent(service, 'plan_activated', { userId, productCode: product.code, meta: { org: true } });
  return { accessUntil: accessUntil! };
}

export type GrantReason = 'ok' | 'not_linked' | 'no_plan' | 'plan_expired' | 'no_org_credits';
/** A tutor/centre gives one of its pool credits to a linked student. The pool is charged first; if the student's credit fails the pool is refunded. */
export async function grantStudentCredit(service: SupabaseClient, adultUserId: string, studentId: string, grantId: string): Promise<{ ok: boolean; reason: GrantReason; balance: number }> {
  const { data: link } = await service.from('student_links').select('id').eq('adult_user_id', adultUserId).eq('student_id', studentId).eq('status', 'active').maybeSingle();
  if (!link) return { ok: false, reason: 'not_linked', balance: await orgBalance(service, adultUserId) };
  const plan = await getOrgPlan(service, adultUserId);
  if (!plan) return { ok: false, reason: 'no_plan', balance: 0 };
  if (!orgPlanActive(plan)) return { ok: false, reason: 'plan_expired', balance: await orgBalance(service, adultUserId) };
  await ensureOrgMonthlyCredits(service, adultUserId);
  const settings = await loadSettings(service);
  const n = Math.max(1, Math.floor(settings.seats.credits_per_grant || 1));
  const bal = await orgBalance(service, adultUserId);
  if (bal < n) return { ok: false, reason: 'no_org_credits', balance: bal };
  const took = await orgCredit(service, adultUserId, -n, 'Given to a student', `grant:${grantId}`);
  if (!took) return { ok: true, reason: 'ok', balance: await orgBalance(service, adultUserId) }; // same grant id pressed twice: already done
  try { await applyCredit(service, studentId, n, 'Given by your tutor/centre', `orggrant:${grantId}`); }
  catch (e) { await orgCredit(service, adultUserId, n, 'Refund: could not reach the student', `grant-refund:${grantId}`); throw e; }
  return { ok: true, reason: 'ok', balance: await orgBalance(service, adultUserId) };
}
