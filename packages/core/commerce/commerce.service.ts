import { applyHeldBonusDays } from '../referral/referral';
import type { SupabaseClient } from '@supabase/supabase-js';

// The commercial layer (v54). Prices, offers, limits and credits live in the database (migration 0029) and are edited at
// /admin/pricing. NOTHING here trusts a price sent by a browser: the amount due is always recomputed on the server.

export interface Product {
  code: string; kind: 'family' | 'individual' | 'subject' | 'mock' | 'tutor' | 'centre'; name: string; subtitle: string | null;
  priceInr: number; listPriceInr: number | null; billing: 'one_time' | 'monthly' | 'per_item';
  subjectCount: number | null; validityUntil: string | null; validityDays: number | null;
  mockCredits: number; creditsPerMonth: number; studentLimit: number | null;
  recommended: boolean; founding: boolean; onSale: boolean; sort: number; features: string[];
}
export interface Offer {
  code: string; label: string; productCode: string; kind: 'percent' | 'fixed' | 'price'; value: number;
  couponCode: string | null; active: boolean; startsOn: string | null; endsOn: string | null; maxUses: number | null; used: number;
}
export interface PriceQuote { listInr: number; discountInr: number; finalInr: number; offer: { code: string; label: string } | null; quantity: number }

export const TERMS_LINE = 'Terms & Conditions Apply.';
export const PRICE_REVISION_LINE = 'Prices and offerings may be revised for future purchases or renewals based on changes in third-party AI, software, infrastructure and other operating costs. A plan already purchased keeps the price, validity and included benefits shown at the time of purchase.';
export const NO_GUARANTEE_LINE = 'Sahayak works alongside school and tuition. It does not promise marks, ranks or results, and AI marking is a suggestion, not a certificate.';

export const DEFAULT_SETTINGS = {
  founding_access: { start: null as string | null, end: '2027-03-31', label: 'Founding Access / Product Validation Phase' },
  free_limits: { tutor_replies_per_day: 10, quiz_questions_per_day: 60, voice_per_day: 5, visual_per_day: 3 },
  paid_limits: { tutor_replies_per_day: 100 },
  handwritten: { credits_required: false, default_max_pages: 8, min_pages: 2, max_pages: 16, marks_per_page: 8, max_upload_mb: 8, max_runs: 3 },
  payment_instructions: { upi_id: '', qr_image_url: '', payee_name: '', extra: '' },
  economics: { ai_cost_per_image_inr: null as number | null, ai_cost_per_eval_base_inr: null as number | null, human_review_cost_inr: null as number | null, infra_per_eval_inr: null as number | null },
  wtp: { enabled: true, features: { board_readiness: [199, 299, 399, 499, 699, 999], handwritten_mock: [299, 399, 499, 699] } as Record<string, number[]>, max_asks_per_user: 2 },
  feature_flags: { plans_page: true, wtp_questions: true, tutor_centre_applications: true },
  entitlements: { enforce: true, paid_features: ['advanced_diagnostic', 'advanced_assessment', 'advanced_parent_report', 'board_readiness', 'board_preparation_programme', 'exam_rescue', 'advanced_analytics'] as string[] },
  seats: { enforce: false, credits_per_grant: 1 },
  funding_probabilities: { researching: 0, shortlisted: 2, warm_intro_needed: 2, introduction_requested: 5, contacted: 5, initial_conversation: 10, deck_sent: 15, due_diligence: 40, term_discussion: 60, committed: 90, funds_received: 100, passed: 0, future_follow_up: 2 } as Record<string, number>,
  crm_probabilities: { new_lead: 5, contacted: 10, interested: 25, demo: 35, trial_pilot: 50, negotiation: 65, payment_pending: 85, paid: 100, active: 100, renewal_upsell: 100, referral: 100 } as Record<string, number>,
  rag: { diagnostic_completion: { green: 60, amber: 40 }, weekly_active_of_total: { green: 30, amber: 15 }, return_within_7_days: { green: 40, amber: 20 }, paid_conversion: { green: 5, amber: 2 }, contribution_margin: { green: 50, amber: 20 }, handwritten_human_review: { green: 30, amber: 50 } } as Record<string, { green: number; amber: number }>,
  fit_weights: { education: 3, ai: 2, edtech: 3, stage: 3, cheque: 2, india: 2, strategic: 2, warm_intro: 2, portfolio: 2, founder: 1 } as Record<string, number>,
  business: { assumed_lifetime_months: null as number | null, product_stage: 'CBSE Class X 2027' },
  boards: { board1_label: 'Board Exam 1', board1_date: null as string | null, board2_label: 'Board Exam 2', board2_date: null as string | null, programme_name: 'Class X 2027 Two-Board Preparation Programme', board1_enabled: true, board2_enabled: true, board1_subjects: null as string[] | null, board2_subjects: null as string[] | null },
};
export type CommerceSettings = typeof DEFAULT_SETTINGS;

const today = () => new Date().toISOString().slice(0, 10);

function rowToProduct(r: any): Product {
  return {
    code: r.code, kind: r.kind, name: r.name, subtitle: r.subtitle ?? null, priceInr: r.price_inr, listPriceInr: r.list_price_inr ?? null, billing: r.billing,
    subjectCount: r.subject_count ?? null, validityUntil: r.validity_until ?? null, validityDays: r.validity_days ?? null,
    mockCredits: r.mock_credits ?? 0, creditsPerMonth: r.credits_per_month ?? 0, studentLimit: r.student_limit ?? null,
    recommended: !!r.recommended, founding: !!r.founding, onSale: !!r.on_sale, sort: r.sort ?? 100, features: r.features ?? [],
  };
}
function rowToOffer(r: any): Offer {
  return { code: r.code, label: r.label, productCode: r.product_code, kind: r.kind, value: r.value, couponCode: r.coupon_code ?? null, active: !!r.active, startsOn: r.starts_on ?? null, endsOn: r.ends_on ?? null, maxUses: r.max_uses ?? null, used: r.used ?? 0 };
}

export async function loadProducts(service: SupabaseClient, onlyOnSale = false): Promise<Product[]> {
  let q = service.from('commerce_products').select('*').order('sort');
  if (onlyOnSale) q = q.eq('on_sale', true);
  const { data } = await q;
  return (data ?? []).map(rowToProduct);
}
export async function loadProduct(service: SupabaseClient, code: string): Promise<Product | null> {
  const { data } = await service.from('commerce_products').select('*').eq('code', code).maybeSingle();
  return data ? rowToProduct(data) : null;
}
export async function loadOffers(service: SupabaseClient): Promise<Offer[]> {
  const { data } = await service.from('commerce_offers').select('*');
  return (data ?? []).map(rowToOffer);
}

/** Settings = defaults overlaid with whatever the founder saved. Never throws (an empty table gives the defaults). */
export async function loadSettings(service: SupabaseClient): Promise<CommerceSettings> {
  const out: any = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  try {
    const { data } = await service.from('commerce_settings').select('key, value');
    for (const r of data ?? []) if (r.key in out && r.value && typeof r.value === 'object') out[r.key] = { ...out[r.key], ...r.value };
  } catch { /* defaults */ }
  return out as CommerceSettings;
}

export function offerIsLive(o: Offer, on: string = today()): boolean {
  if (!o.active) return false;
  if (o.startsOn && on < o.startsOn) return false;
  if (o.endsOn && on > o.endsOn) return false;
  if (o.maxUses !== null && o.used >= o.maxUses) return false;
  return true;
}

function priceWithOffer(unit: number, o: Offer): number {
  const v = o.kind === 'percent' ? Math.round(unit * (1 - Math.min(100, o.value) / 100)) : o.kind === 'fixed' ? unit - o.value : o.value;
  return Math.max(0, Math.min(unit, v));
}

/**
 * Pure. Picks the best live offer for the product: automatic offers (no coupon) always apply; a coupon applies only if typed
 * exactly. The list price is the product's list price (or price). The result is what the person owes, per unit times quantity.
 */
export function quotePrice(product: Product, offers: Offer[], coupon: string | null | undefined, quantity = 1, on: string = today()): PriceQuote {
  const qty = product.billing === 'per_item' ? Math.min(20, Math.max(1, Math.floor(quantity) || 1)) : 1;
  const listUnit = Math.max(product.priceInr, product.listPriceInr ?? 0);
  const c = (coupon ?? '').trim().toLowerCase();
  let bestUnit = product.priceInr;
  let best: Offer | null = null;
  for (const o of offers) {
    if (!offerIsLive(o, on)) continue;
    if (o.productCode !== 'any' && o.productCode !== product.code) continue;
    if (o.couponCode && o.couponCode.toLowerCase() !== c) continue;
    const p = priceWithOffer(product.priceInr, o);
    if (p < bestUnit) { bestUnit = p; best = o; }
  }
  return { listInr: listUnit * qty, discountInr: (listUnit - bestUnit) * qty, finalInr: bestUnit * qty, offer: best ? { code: best.code, label: best.label } : null, quantity: qty };
}

/** The date a plan bought today ends: the product's fixed date, else today + validity_days, else the founding-access end. */
export function planEndDate(product: Product, settings: CommerceSettings, from: Date = new Date()): string | null {
  if (product.validityUntil) return product.validityUntil;
  if (product.validityDays) return new Date(from.getTime() + product.validityDays * 86400000).toISOString().slice(0, 10);
  return settings.founding_access.end ?? null;
}

// ---- Credits -----------------------------------------------------------------------------------------
export async function creditBalance(service: SupabaseClient, studentId: string): Promise<number> {
  const { data } = await service.from('mock_credit_ledger').select('delta').eq('student_id', studentId);
  return (data ?? []).reduce((a: number, r: any) => a + (r.delta ?? 0), 0);
}

/** Idempotent: the same (student, ref) is only ever applied once. Returns true when a new row was written. */
export async function applyCredit(service: SupabaseClient, studentId: string, delta: number, reason: string, ref: string): Promise<boolean> {
  const { data: existing } = await service.from('mock_credit_ledger').select('id').eq('student_id', studentId).eq('ref', ref).maybeSingle();
  if (existing) return false;
  const { error } = await service.from('mock_credit_ledger').insert({ student_id: studentId, delta, reason, ref });
  if (error) { if (/duplicate|unique/i.test(error.message)) return false; throw error; }
  return true;
}

/** Monthly credits (credits_per_month) for every calendar month from the start month to this one, up to the plan end. Idempotent. */
export async function ensureMonthlyCredits(service: SupabaseClient, studentId: string, on: string = today()): Promise<number> {
  const { data: acc } = await service.from('student_access').select('product_code, starts_on, access_until').eq('student_id', studentId).maybeSingle();
  if (!acc?.product_code) return 0;
  const product = await loadProduct(service, acc.product_code);
  if (!product || product.creditsPerMonth <= 0) return 0;
  const start = (acc.starts_on ?? on).slice(0, 7);
  const last = (acc.access_until && acc.access_until < on ? acc.access_until : on).slice(0, 7);
  let made = 0;
  let [y, m] = start.split('-').map(Number);
  for (let guard = 0; guard < 36; guard++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > last) break;
    if (await applyCredit(service, studentId, product.creditsPerMonth, `Monthly credits ${key}`, `monthly:${product.code}:${key}`)) made += product.creditsPerMonth;
    m++; if (m > 12) { m = 1; y++; }
  }
  return made;
}

export function pagesAllowedForExam(exam: { max_pages?: number | null }, settings: CommerceSettings): number {
  const h = settings.handwritten;
  return Math.min(h.max_pages, Math.max(h.min_pages, exam.max_pages ?? h.default_max_pages));
}

/** Can this student start a handwritten evaluation for this exam? Pure given the numbers. */
export function handwrittenDecision(p: { creditsRequired: boolean; balance: number; alreadyCharged: boolean }): { ok: boolean; reason: 'ok' | 'no_credits' } {
  if (!p.creditsRequired || p.alreadyCharged) return { ok: true, reason: 'ok' };
  return p.balance >= 1 ? { ok: true, reason: 'ok' } : { ok: false, reason: 'no_credits' };
}

export async function checkHandwritten(service: SupabaseClient, studentId: string, examId: string): Promise<{ ok: boolean; reason: 'ok' | 'no_credits'; balance: number; creditsRequired: boolean }> {
  const settings = await loadSettings(service);
  await ensureMonthlyCredits(service, studentId);
  const balance = await creditBalance(service, studentId);
  const { data: charged } = await service.from('mock_credit_ledger').select('id').eq('student_id', studentId).eq('ref', `eval:${examId}`).maybeSingle();
  const d = handwrittenDecision({ creditsRequired: settings.handwritten.credits_required, balance, alreadyCharged: !!charged });
  return { ...d, balance, creditsRequired: settings.handwritten.credits_required };
}

/** Called only AFTER the evaluation succeeded. One credit per exam, ever (ref = eval:<exam id>). */
export async function chargeHandwritten(service: SupabaseClient, studentId: string, examId: string): Promise<void> {
  const settings = await loadSettings(service);
  if (!settings.handwritten.credits_required) return;
  await applyCredit(service, studentId, -1, 'Handwritten mock evaluation', `eval:${examId}`);
}

// ---- Purchase and activation -----------------------------------------------------------------------------
export interface PurchaseRequest { studentId: string; userId: string | null; productCode: string; subjectSlugs: string[]; coupon?: string | null; quantity?: number; paymentDate: string; reference: string | null; paidByUserId?: string | null }

export async function createPurchaseRequest(service: SupabaseClient, r: PurchaseRequest): Promise<{ paymentId: string; quote: PriceQuote }> {
  const product = await loadProduct(service, r.productCode);
  if (!product || !product.onSale) throw new Error('product_not_available');
  if (product.kind === 'tutor' || product.kind === 'centre') throw new Error('apply_instead');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.paymentDate)) throw new Error('bad_payment_date');
  const ref = (r.reference ?? '').trim().slice(0, 60) || null;
  if (!ref) throw new Error('payment_reference_required');
  const slugs = [...new Set(r.subjectSlugs.map((s) => String(s).slice(0, 60)))];
  if (product.subjectCount !== null && product.kind !== 'mock') {
    if (slugs.length < 1) throw new Error('choose_subjects');
    if (slugs.length > product.subjectCount) throw new Error('too_many_subjects');
  }
  const { data: dupe } = await service.from('pilot_payments').select('id').eq('student_id', r.studentId).eq('product_code', product.code).eq('status', 'pending').gte('created_at', new Date(Date.now() - 30 * 60000).toISOString()).limit(1);
  if (dupe && dupe.length) throw new Error('already_submitted');
  const offers = await loadOffers(service);
  const quote = quotePrice(product, offers, r.coupon, r.quantity ?? 1);
  const { data, error } = await service.from('pilot_payments').insert({
    student_id: r.studentId, offer_label: product.name, amount: quote.finalInr, payment_date: r.paymentDate, transaction_reference: ref, status: 'pending',
    product_code: product.code, list_amount: quote.listInr, discount_amount: quote.discountInr, offer_code: quote.offer?.code ?? null, quantity: quote.quantity, subject_slugs: slugs.length ? slugs : null, paid_by_user_id: r.paidByUserId ?? null,
  }).select('id').single();
  if (error) { if (/uq_pilot_payments_ref|duplicate/i.test(error.message)) throw new Error('reference_already_used'); throw error; }
  await recordCommerceEvent(service, 'payment_submitted', { userId: r.userId, studentId: r.studentId, productCode: product.code, amount: quote.finalInr, meta: { subjects: slugs, byParent: !!r.paidByUserId } });
  return { paymentId: data!.id, quote };
}

/**
 * Admin-only. Marks the payment confirmed AND activates what was bought, in one explicit admin action:
 *  - mock product: adds quantity credits;
 *  - family/individual/subject: sets student_access (plan, subject limit, end date), registers nothing by itself, grants the one-off credits;
 *  - monthly credits are added lazily by ensureMonthlyCredits.
 * Safe to press twice: credits use idempotency keys and the payment is only activated once.
 */
export async function verifyAndActivate(service: SupabaseClient, paymentId: string, adminEmail: string, adminNotes?: string): Promise<{ activated: string }> {
  const { data: p } = await service.from('pilot_payments').select('*').eq('id', paymentId).single();
  if (!p) throw new Error('payment_not_found');
  if (p.status === 'rejected' || p.status === 'refunded') throw new Error('payment_not_active');
  if (!p.product_code) throw new Error('old_style_payment_use_confirm');
  const product = await loadProduct(service, p.product_code);
  if (!product) throw new Error('product_not_found');
  const settings = await loadSettings(service);
  const sid = p.student_id as string;
  if (p.status === 'pending') {
    await service.from('pilot_payments').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), admin_notes: adminNotes ?? null }).eq('id', paymentId);
    await recordCommerceEvent(service, 'payment_verified', { studentId: sid, productCode: product.code, amount: Math.round(Number(p.amount)) });
  }
  if (!p.activated_at) {
    if (product.kind === 'mock') {
      await applyCredit(service, sid, (p.quantity ?? 1) * Math.max(1, product.mockCredits), `Bought ${product.name}`, `pay:${paymentId}`);
      await recordCommerceEvent(service, 'mock_purchased', { studentId: sid, productCode: product.code, amount: Math.round(Number(p.amount)) });
    } else {
      const end = planEndDate(product, settings);
      const { data: cur } = await service.from('student_access').select('plan_code, subject_limit, access_until').eq('student_id', sid).maybeSingle();
      const limit = Math.max(product.subjectCount ?? 1, cur && cur.plan_code !== 'free' ? cur.subject_limit : 1);
      const keepEnd = cur?.access_until && end && cur.access_until > end && cur.plan_code !== 'free' ? cur.access_until : end;
      const { error } = await service.from('student_access').upsert({
        student_id: sid, plan_code: 'founding_family', subject_limit: Math.min(10, limit), access_until: keepEnd, product_code: product.code,
        starts_on: today(), notes: `${product.name} (payment ${paymentId.slice(0, 8)})`, updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });
      if (error) throw error;
      if (product.mockCredits > 0) await applyCredit(service, sid, product.mockCredits, `Included with ${product.name}`, `plan:${paymentId}`);
      await ensureMonthlyCredits(service, sid);
      await applyHeldBonusDays(service, sid).catch(() => 0); // v60: referral bonus days waiting for a paid plan
      await recordCommerceEvent(service, 'plan_activated', { studentId: sid, productCode: product.code, amount: Math.round(Number(p.amount)) });
    }
    if (p.offer_code) {
      const { data: o } = await service.from('commerce_offers').select('used').eq('code', p.offer_code).maybeSingle();
      if (o) await service.from('commerce_offers').update({ used: (o.used ?? 0) + 1 }).eq('code', p.offer_code);
    }
    await service.from('pilot_payments').update({ activated_at: new Date().toISOString(), activated_by: adminEmail, pilot_start_date: today(), pilot_end_date: product.kind === 'mock' ? null : planEndDate(product, settings) }).eq('id', paymentId);
  }
  return { activated: product.name };
}

// ---- Events, interest, willingness to pay ------------------------------------------------------------------
export const COMMERCE_EVENTS = [
  'pricing_page_view', 'plan_selected', 'subject_selected', 'checkout_started', 'payment_instructions_viewed', 'payment_submitted', 'payment_verified',
  'plan_activated', 'mock_purchased', 'mock_submitted', 'mock_completed', 'upgrade_clicked', 'tutor_interest', 'centre_interest', 'readiness_offer_viewed',
  'readiness_purchase_intent', 'mock_offer_viewed', 'willingness_to_pay_response', 'readiness_report_viewed',
] as const;
export type CommerceEvent = (typeof COMMERCE_EVENTS)[number];

export async function recordCommerceEvent(service: SupabaseClient, event: CommerceEvent, p: { userId?: string | null; studentId?: string | null; productCode?: string | null; amount?: number | null; meta?: Record<string, unknown> } = {}): Promise<void> {
  try { await service.from('commerce_events').insert({ event, user_id: p.userId ?? null, student_id: p.studentId ?? null, product_code: p.productCode ?? null, amount: p.amount ?? null, meta: p.meta ?? {} }); } catch { /* never blocks */ }
}

/** Should we show the willingness-to-pay question now? At most max_asks_per_user questions per person, one per feature. */
export async function nextWtpQuestion(service: SupabaseClient, userId: string, feature: string): Promise<{ price: number } | null> {
  const s = await loadSettings(service);
  if (!s.wtp.enabled || !s.feature_flags.wtp_questions) return null;
  const prices = s.wtp.features[feature];
  if (!prices || !prices.length) return null;
  const { data } = await service.from('wtp_responses').select('feature').eq('user_id', userId);
  if ((data ?? []).length >= s.wtp.max_asks_per_user || (data ?? []).some((r: any) => r.feature === feature)) return null;
  // Spread people across the price points evenly and repeatably (not random per page view).
  let h = 0; for (const ch of userId + feature) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { price: prices[h % prices.length] };
}

/** Admin refund of an activated purchase: takes back the plan (if it is still this product) and the credits it gave. Idempotent. */
export async function revokeActivation(service: SupabaseClient, paymentId: string): Promise<void> {
  const { data: p } = await service.from('pilot_payments').select('student_id, product_code, activated_at, quantity').eq('id', paymentId).maybeSingle();
  if (!p?.product_code || !p.activated_at) return;
  const product = await loadProduct(service, p.product_code);
  if (!product) return;
  if (product.kind === 'mock') {
    await applyCredit(service, p.student_id, -((p.quantity ?? 1) * Math.max(1, product.mockCredits)), `Refund ${product.name}`, `refund:${paymentId}`);
    return;
  }
  const { data: acc } = await service.from('student_access').select('product_code').eq('student_id', p.student_id).maybeSingle();
  if (acc?.product_code === product.code) {
    await service.from('student_access').update({ plan_code: 'free', subject_limit: 1, access_until: null, product_code: null, notes: `Refunded ${product.name}`, updated_at: new Date().toISOString() }).eq('student_id', p.student_id);
  }
  if (product.mockCredits > 0) await applyCredit(service, p.student_id, -product.mockCredits, `Refund ${product.name}`, `refund:${paymentId}`);
}

// ---- Admin economics ----------------------------------------------------------------------------------
export interface EvalEconomics {
  status: 'insufficient_data' | 'ok' | 'review_pricing';
  netPriceInr: number; images: number; humanReviewRate: number;
  aiCostInr: number | null; humanCostInr: number | null; infraCostInr: number | null; totalCostInr: number | null;
  contributionInr: number | null; marginPct: number | null; missing: string[];
}
/**
 * Pure. Contribution for ONE handwritten evaluation = net price - (AI cost + expected human review cost + infrastructure).
 * Every cost is the founder's ASSUMPTION from settings; any missing assumption gives "insufficient_data" (never a guess).
 */
export function handwrittenEconomics(p: { netPriceInr: number; avgImages: number; humanReviewRate: number; assumptions: CommerceSettings['economics'] }): EvalEconomics {
  const a = p.assumptions;
  const missing: string[] = [];
  if (a.ai_cost_per_image_inr === null) missing.push('AI cost per image');
  if (a.human_review_cost_inr === null) missing.push('human review cost');
  if (a.infra_per_eval_inr === null) missing.push('infrastructure per evaluation');
  const base = a.ai_cost_per_eval_base_inr ?? 0;
  if (missing.length) return { status: 'insufficient_data', netPriceInr: p.netPriceInr, images: p.avgImages, humanReviewRate: p.humanReviewRate, aiCostInr: null, humanCostInr: null, infraCostInr: null, totalCostInr: null, contributionInr: null, marginPct: null, missing };
  const ai = base + p.avgImages * (a.ai_cost_per_image_inr as number);
  const human = p.humanReviewRate * (a.human_review_cost_inr as number);
  const infra = a.infra_per_eval_inr as number;
  const total = ai + human + infra;
  const contribution = p.netPriceInr - total;
  const margin = p.netPriceInr > 0 ? (contribution / p.netPriceInr) * 100 : null;
  return { status: contribution < 0 ? 'review_pricing' : 'ok', netPriceInr: p.netPriceInr, images: p.avgImages, humanReviewRate: p.humanReviewRate, aiCostInr: ai, humanCostInr: human, infraCostInr: infra, totalCostInr: total, contributionInr: contribution, marginPct: margin, missing: [] };
}

/** The largest number of images per evaluation at which contribution stays >= 0 (null when assumptions are missing or per-image cost is 0). */
export function maxEconomicImages(netPriceInr: number, humanReviewRate: number, a: CommerceSettings['economics']): number | null {
  if (a.ai_cost_per_image_inr === null || a.human_review_cost_inr === null || a.infra_per_eval_inr === null || a.ai_cost_per_image_inr <= 0) return null;
  const fixed = (a.ai_cost_per_eval_base_inr ?? 0) + humanReviewRate * a.human_review_cost_inr + a.infra_per_eval_inr;
  return Math.max(0, Math.floor((netPriceInr - fixed) / a.ai_cost_per_image_inr));
}

export function periodStart(period: string, now: Date = new Date()): string | null {
  const days = period === '7' ? 7 : period === '30' ? 30 : period === '90' ? 90 : period === 'today' ? 0 : null;
  if (days === null) return period === 'month' ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString() : null;
  if (days === 0) return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  return new Date(now.getTime() - days * 86400000).toISOString();
}
