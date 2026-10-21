import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSettings, handwrittenEconomics, type CommerceSettings } from '../commerce/commerce.service';
import { buildUsageReport, freeProviderNames, type UsageRow } from '../ai-provider/usage';
import { rangeBounds, inRange, dateInRange, type RangeBounds } from './ranges';
import { pct, ragStatus, weightedPipeline, type Rag, type DataLabel } from './scoring';
import { INSTITUTION_KINDS } from './constants';

// The Founder Command Centre numbers. ADMIN ONLY. Every figure carries a label:
//   ACTUAL = counted from records in the database;  ESTIMATED = computed from list prices or partial data;
//   ASSUMED = depends on an assumption the founder set;  INSUFFICIENT = cannot be calculated yet (shown as "Insufficient data").
// Nothing here returns a child's name, answers or private details.

export interface Metric { value: number | null; label: DataLabel; note?: string; rag?: Rag }
const M = (value: number | null, label: DataLabel = 'ACTUAL', note?: string, rag?: Rag): Metric => (value === null ? { value: null, label: 'INSUFFICIENT', note, rag } : { value, label, note, rag });

export interface RawData {
  users: any[]; students: any[]; sessions: any[]; attempts: any[]; mocks: any[]; payments: any[]; revenueEntries: any[]; access: any[]; expenses: any[];
  aiUsage: UsageRow[]; adults: any[]; orgPlans: any[]; links: any[]; crm: any[]; funding: any[]; tasks: any[]; evals: any[]; events: any[]; docs: any[]; products: any[];
}
export interface Alert { level: 'red' | 'amber' | 'info'; text: string; href: string }
export interface Action { priority: number; text: string; href?: string }

const DAY = 86400000;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const uniq = <T,>(xs: T[]) => new Set(xs);
const todayIst = (now: Date) => new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);

export function computeCommandCentre(d: RawData, settings: CommerceSettings, range: RangeBounds, now: Date = new Date()) {
  const confirmed = d.payments.filter((p) => p.status === 'confirmed');
  const payAt = (p: any) => p.confirmed_at ?? p.created_at;
  const revenueIn = (r: { from: string | null; to: string | null }) =>
    sum(confirmed.filter((p) => inRange(payAt(p), r)).map((p) => Number(p.amount))) + sum(d.revenueEntries.filter((e) => dateInRange(e.received_on, r)).map((e) => Number(e.amount_inr)));
  const fixedRange = (days: number) => rangeBounds(String(days), {}, now);
  const costsIn = (r: { from: string | null; to: string | null }) => {
    const ex = d.expenses.filter((e) => dateInRange(e.spent_on, r));
    const by: Record<string, number> = {};
    for (const e of ex) by[e.category] = (by[e.category] ?? 0) + Number(e.amount_inr);
    const aiRows = d.aiUsage.filter((u) => inRange(u.created_at, r));
    const rep = buildUsageReport(aiRows, freeProviderNames());
    const aiBilled = rep.total.billedInr, aiList = rep.total.listPriceInr;
    const aiCost = Math.max(aiBilled, by.ai_api ?? 0);
    const variable = aiCost + (by.teacher ?? 0) + (by.evaluator ?? 0) + (by.reviewer ?? 0) + (by.referral ?? 0);
    const other = (by.infrastructure ?? 0) + (by.content ?? 0) + (by.marketing ?? 0) + (by.legal_accounting ?? 0) + (by.other ?? 0);
    return { by, aiBilled, aiList, aiCost, variable, other, total: variable + other, recorded: ex.length > 0 };
  };

  // ---- today / month / year ----
  const rToday = rangeBounds('today', {}, now), rMonth = rangeBounds('month', {}, now), rYear = rangeBounds('year', {}, now);
  const snapshotCosts = { today: costsIn(rToday), month: costsIn(rMonth), year: costsIn(rYear) };
  const revToday = revenueIn(rToday), revMonth = revenueIn(rMonth), revYear = revenueIn(rYear);

  // ---- users ----
  const studentUsers = d.users.filter((u) => u.role === 'student');
  const roleCount = (r: string) => d.users.filter((u) => u.role === r).length;
  const sidOf = new Map<string, string>(); // student id -> user id
  for (const s of d.students) sidOf.set(s.id, s.user_id);
  const activeSet = (days: number) => {
    const from = new Date(now.getTime() - days * DAY).toISOString();
    return uniq([...d.sessions.filter((s) => s.started_at >= from).map((s) => s.student_id), ...d.attempts.filter((a) => a.started_at >= from).map((a) => a.student_id), ...d.mocks.filter((m) => m.started_at >= from).map((m) => m.student_id)]);
  };
  const studentsTotal = d.students.length;
  const dau = activeSet(1).size, wau = activeSet(7).size, mau = activeSet(30).size;
  const diagStartedIn = uniq(d.attempts.filter((a) => inRange(a.started_at, range)).map((a) => a.student_id));
  const diagDoneIn = uniq(d.attempts.filter((a) => a.status === 'completed' && inRange(a.completed_at ?? a.started_at, range)).map((a) => a.student_id));
  const diagCompletion = pct(diagDoneIn.size, diagStartedIn.size);
  const allDiagDone = uniq(d.attempts.filter((a) => a.status === 'completed').map((a) => a.student_id));
  const activation = pct(allDiagDone.size, studentsTotal);

  // return within 7 days (students whose first session was 7+ days ago)
  const firstSess = new Map<string, number>(); const sessTimes = new Map<string, number[]>();
  for (const s of d.sessions) { const t = Date.parse(s.started_at); if (!firstSess.has(s.student_id) || t < firstSess.get(s.student_id)!) firstSess.set(s.student_id, t); (sessTimes.get(s.student_id) ?? sessTimes.set(s.student_id, []).get(s.student_id)!).push(t); }
  let base = 0, ret = 0;
  for (const [sid, f] of firstSess) { if (now.getTime() - f < 7 * DAY) continue; base++; if ((sessTimes.get(sid) ?? []).some((t) => t > f + 12 * 3600000 && t <= f + 7 * DAY)) ret++; }
  const returnRate = pct(ret, base);

  // ---- paid ----
  const today = todayIst(now);
  const paidAccess = d.access.filter((a) => a.plan_code && a.plan_code !== 'free' && a.product_code && (!a.access_until || a.access_until >= today));
  const paidStudents = uniq(paidAccess.map((a) => a.student_id));
  const paidConversion = pct(paidStudents.size, studentsTotal);
  const parentIds = uniq(d.links.filter((l) => l.link_type === 'parent').map((l) => l.adult_user_id));

  // ---- revenue in range ----
  const revRange = revenueIn(range);
  const payIn = confirmed.filter((p) => inRange(payAt(p), range));
  const byProduct: Record<string, number> = {}, byType: Record<string, number> = {}, byMethod: Record<string, number> = {};
  for (const p of payIn) { const k = p.product_code ?? '(older payments)'; byProduct[k] = (byProduct[k] ?? 0) + Number(p.amount); byType.student_family = (byType.student_family ?? 0) + Number(p.amount); byMethod[p.payment_method ?? 'upi'] = (byMethod[p.payment_method ?? 'upi'] ?? 0) + Number(p.amount); }
  for (const e of d.revenueEntries.filter((x) => dateInRange(x.received_on, range))) { const k = e.product || '(other income)'; byProduct[k] = (byProduct[k] ?? 0) + Number(e.amount_inr); byType[e.customer_kind] = (byType[e.customer_kind] ?? 0) + Number(e.amount_inr); byMethod[e.method] = (byMethod[e.method] ?? 0) + Number(e.amount_inr); }
  const productKind = new Map<string, string>(d.products.map((p) => [p.code, p.kind]));
  const revBy = (pred: (code: string) => boolean) => sum(Object.entries(byProduct).filter(([k]) => pred(k)).map(([, v]) => v));
  const revHandwritten = revBy((k) => productKind.get(k) === 'mock');
  const revInstitutional = sum(d.revenueEntries.filter((e) => dateInRange(e.received_on, range) && e.customer_kind !== 'student' && e.customer_kind !== 'parent').map((e) => Number(e.amount_inr))) + revBy((k) => ['tutor', 'centre'].includes(productKind.get(k) ?? ''));

  // ---- costs & unit economics (range) ----
  const c = costsIn(range);
  const payers = uniq(payIn.map((p) => p.student_id)).size + d.revenueEntries.filter((e) => dateInRange(e.received_on, range)).length;
  const firstPay = new Map<string, string>();
  for (const p of confirmed.slice().sort((a, b) => (payAt(a) > payAt(b) ? 1 : -1))) if (!firstPay.has(p.student_id)) firstPay.set(p.student_id, payAt(p));
  const newPayers = [...firstPay.values()].filter((t) => inRange(t, range)).length;
  const marketing = (c.by.marketing ?? 0) + (c.by.referral ?? 0);
  const cac = newPayers > 0 && marketing > 0 ? Math.round(marketing / newPayers) : null;
  const allPayers = uniq(confirmed.map((p) => p.student_id)).size + d.revenueEntries.length;
  const revAll = sum(confirmed.map((p) => Number(p.amount))) + sum(d.revenueEntries.map((e) => Number(e.amount_inr)));
  const ltvToDate = allPayers > 0 ? Math.round(revAll / allPayers) : null;
  const contribution = revRange > 0 || c.recorded || c.aiList > 0 ? revRange - c.variable : null;
  const profit = revRange > 0 || c.recorded ? revRange - c.total : null;
  const contributionMargin = revRange > 0 && contribution !== null ? Math.round((contribution / revRange) * 1000) / 10 : null;
  const unit = {
    revenuePerCustomer: M(payers > 0 ? Math.round(revRange / payers) : null),
    aiCostPerCustomer: M(payers > 0 ? Math.round(c.aiCost / payers) : null, 'ACTUAL'),
    variableCostPerCustomer: M(payers > 0 ? Math.round(c.variable / payers) : null),
    profitPerCustomer: M(payers > 0 && profit !== null ? Math.round(profit / payers) : null, 'ESTIMATED', 'Only costs you have recorded are counted'),
    cac: M(cac, 'ACTUAL', cac === null ? 'Needs marketing spend recorded and at least one new paying customer in this period' : undefined),
    ltvToDate: M(ltvToDate, 'ESTIMATED', 'Revenue per paying customer so far. A true lifetime value needs renewals over time.'),
    ltvToCac: M(cac && ltvToDate ? Math.round((ltvToDate / cac) * 10) / 10 : null, 'ESTIMATED'),
  };

  // ---- funnel ----
  const regStudents = studentUsers.filter((u) => inRange(u.created_at, range)).length;
  const sessStarted = uniq(d.sessions.filter((s) => inRange(s.started_at, range)).map((s) => s.student_id));
  const meaningful = (() => { const n = new Map<string, number>(); for (const s of d.sessions.filter((x) => x.status === 'completed' && inRange(x.started_at, range))) n.set(s.student_id, (n.get(s.student_id) ?? 0) + 1); return [...n.values()].filter((v) => v >= 2).length; })();
  const mockStudents = uniq(d.mocks.filter((m) => inRange(m.started_at, range)).map((m) => m.student_id));
  const hwBuyers = uniq(payIn.filter((p) => productKind.get(p.product_code) === 'mock').map((p) => p.student_id));
  const paidInRange = uniq(payIn.map((p) => p.student_id));
  const returning = (() => { let n = 0; for (const [sid, ts] of sessTimes) { const days = uniq(ts.filter((t) => inRange(new Date(t).toISOString(), range)).map((t) => new Date(t + 330 * 60000).toISOString().slice(0, 10))); if (days.size >= 2 && sid) n++; } return n; })();
  const referrals = d.crm.filter((r) => r.stage === 'referral').length + studentUsers.filter((u) => u.source === 'referral' && inRange(u.created_at, range)).length;
  const funnelRaw: [string, number | null, string?][] = [
    ['Visitor / landing page', null, 'Website visits are not tracked yet'], ['Sign-up', regStudents], ['Diagnostic started', diagStartedIn.size], ['Diagnostic completed', diagDoneIn.size],
    ['Learning started', sessStarted.size], ['First meaningful session (2 completed)', meaningful], ['Mock exam attempted', mockStudents.size],
    ['Handwritten evaluation purchased', hwBuyers.size], ['Paid plan purchased', paidInRange.size], ['Returning user (2+ days)', returning], ['Referral', referrals],
  ];
  let prev: number | null = null;
  const funnel = funnelRaw.map(([stage, n, note]) => { const row = { stage, count: n, fromPrevious: n !== null && prev ? pct(n, prev) : null, note }; if (n !== null) prev = n; return row; });

  // ---- sources ----
  const sources: Record<string, { signups: number; active: number; paid: number; revenue: number }> = {};
  const userOfStudent = new Map(d.students.map((s) => [s.id, d.users.find((u) => u.id === s.user_id)]));
  for (const u of studentUsers.filter((x) => inRange(x.created_at, range))) {
    const src = u.source ?? 'direct'; (sources[src] ??= { signups: 0, active: 0, paid: 0, revenue: 0 }).signups++;
  }
  const mauSet = activeSet(30);
  for (const [sid, u] of userOfStudent) {
    if (!u || !inRange(u.created_at, range)) continue;
    const row = (sources[u.source ?? 'direct'] ??= { signups: 0, active: 0, paid: 0, revenue: 0 });
    if (mauSet.has(sid)) row.active++;
    if (paidStudents.has(sid)) row.paid++;
    row.revenue += sum(confirmed.filter((p) => p.student_id === sid).map((p) => Number(p.amount)));
  }

  // ---- learning outcomes ----
  const finished = d.sessions.filter((s) => s.status === 'completed' && inRange(s.started_at, range) && s.starting_mastery != null && s.ending_mastery != null);
  const avgChange = finished.length >= 10 ? Math.round((sum(finished.map((s) => Number(s.ending_mastery) - Number(s.starting_mastery))) / finished.length) * 10) / 10 : null;

  // ---- handwritten ----
  const evIn = d.evals.filter((e) => inRange(e.created_at, range));
  const humanRate = evIn.length ? Math.round((evIn.filter((e) => e.status === 'needs_teacher' || e.status === 'teacher_done').length / evIn.length) * 1000) / 10 : null;
  const failedPapers = d.mocks.filter((m) => m.review_status === 'FAILED' && inRange(m.started_at, range)).length;
  const hwPapers = d.mocks.filter((m) => m.review_status && inRange(m.started_at, range)).length;
  const mockProduct = d.products.find((p) => p.kind === 'mock');
  const mockSales = payIn.filter((p) => p.product_code === mockProduct?.code);
  const units = sum(mockSales.map((p) => p.quantity ?? 1));
  const netPrice = units ? sum(mockSales.map((p) => Number(p.amount))) / units : mockProduct?.price_inr ?? 0;
  const eco = handwrittenEconomics({ netPriceInr: netPrice, avgImages: settings.handwritten.default_max_pages, humanReviewRate: (humanRate ?? 0) / 100, assumptions: settings.economics });

  // ---- B2B ----
  const adultsBy = (role: string) => d.adults.filter((a) => a.role === role);
  const pilots = d.crm.filter((r) => INSTITUTION_KINDS.includes(r.kind) && r.extra?.pilot_status && !['none', ''].includes(String(r.extra.pilot_status)));
  const institutions = d.crm.filter((r) => INSTITUTION_KINDS.includes(r.kind));

  // ---- CRM / funding ----
  const crmOpen = d.crm.filter((r) => r.status === 'open');
  const crmByStage: Record<string, number> = {}; for (const r of crmOpen) crmByStage[r.stage] = (crmByStage[r.stage] ?? 0) + 1;
  const crmPipe = weightedPipeline(crmOpen.map((r) => ({ stage: r.stage, status: r.status, amount: r.potential_value })), settings.crm_probabilities, ['paid', 'active', 'renewal_upsell', 'referral']);
  const fundByKind: Record<string, number> = {}, fundByStage: Record<string, number> = {};
  for (const f of d.funding) { fundByKind[f.kind] = (fundByKind[f.kind] ?? 0) + 1; fundByStage[f.stage] = (fundByStage[f.stage] ?? 0) + 1; }
  const investors = d.funding.filter((f) => f.kind === 'investor');
  const fundPipe = weightedPipeline(investors.map((f) => ({ stage: f.stage, amount: f.amount_requested ?? f.amount_offered })), settings.funding_probabilities, ['passed', 'funds_received']);
  const committed = sum(d.funding.filter((f) => f.stage === 'committed').map((f) => Number(f.amount_offered ?? 0)));
  const received = sum(d.funding.map((f) => Number(f.amount_received ?? 0)));
  const applications = (kind: string) => d.funding.filter((f) => f.kind === kind && ['applied', 'shortlisted', 'funded'].includes(f.eligibility_status)).length;
  const meetings = investors.filter((f) => ['initial_conversation', 'deck_sent', 'due_diligence', 'term_discussion', 'committed', 'funds_received'].includes(f.stage)).length;
  const docsMissing = d.docs.filter((x) => x.status !== 'complete').length;

  // ---- customer-type comparison (computed parts only) ----
  const typeRows = [['parent', 'Parents / families'], ['tutor', 'Tutors'], ['centre', 'Coaching centres'], ['school', 'Private schools'], ['govt_school', 'Government schools'], ['govt_institution', 'Government departments']].map(([k, label]) => {
    const rs = d.crm.filter((r) => r.kind === k || (k === 'parent' && r.kind === 'student'));
    const won = rs.filter((r) => ['paid', 'active', 'renewal_upsell', 'referral'].includes(r.stage) || r.status === 'won').length;
    return { kind: k, label, leads: rs.length, won, conversion: pct(won, rs.length), amountPaid: sum(rs.map((r) => Number(r.amount_paid ?? 0))), openPotential: sum(rs.filter((r) => r.status === 'open').map((r) => Number(r.potential_value ?? 0))) };
  });

  // ---- RAG ----
  const rag = {
    diagnostic_completion: ragStatus(diagCompletion, settings.rag.diagnostic_completion),
    weekly_active: ragStatus(pct(wau, studentsTotal), settings.rag.weekly_active_of_total),
    return_within_7_days: ragStatus(returnRate, settings.rag.return_within_7_days),
    paid_conversion: ragStatus(paidConversion, settings.rag.paid_conversion),
    contribution_margin: ragStatus(contributionMargin, settings.rag.contribution_margin),
    handwritten_human_review: ragStatus(humanRate, settings.rag.handwritten_human_review, true),
  };
  const ragValues = Object.values(rag).filter((x) => x !== 'grey');
  const health: Rag = !ragValues.length ? 'grey' : ragValues.includes('red') ? (ragValues.filter((x) => x === 'red').length >= 2 ? 'red' : 'amber') : ragValues.includes('amber') ? 'amber' : 'green';

  // ---- alerts ----
  const alerts: Alert[] = [];
  const pend = d.payments.filter((p) => p.status === 'pending');
  if (pend.length) { const oldest = Math.max(...pend.map((p) => (now.getTime() - Date.parse(p.created_at)) / DAY)); alerts.push({ level: oldest > 3 ? 'red' : 'amber', text: `${pend.length} payment${pend.length > 1 ? 's' : ''} waiting to be verified (oldest ${Math.floor(oldest)} day${Math.floor(oldest) === 1 ? '' : 's'}).`, href: '/admin/payments' }); }
  const overdue = (rows: any[]) => rows.filter((r) => r.next_followup && r.next_followup < today && (r.status ? r.status === 'open' : !['passed', 'funds_received'].includes(r.stage)));
  const dueToday = (rows: any[]) => rows.filter((r) => r.next_followup === today && (r.status ? r.status === 'open' : !['passed', 'funds_received'].includes(r.stage)));
  const od = overdue(d.crm).length, dt = dueToday(d.crm).length, fod = overdue(d.funding).length, fdt = dueToday(d.funding).length;
  if (od || dt) alerts.push({ level: od ? 'red' : 'amber', text: `Customer follow-ups: ${od} overdue, ${dt} due today.`, href: '/admin/crm' });
  if (fod || fdt) alerts.push({ level: fod ? 'red' : 'amber', text: `Investor / funding follow-ups: ${fod} overdue, ${fdt} due today.`, href: '/admin/funding' });
  const soon = (day: string | null | undefined, n: number) => !!day && day >= today && day <= new Date(now.getTime() + n * DAY).toISOString().slice(0, 10);
  for (const f of d.funding.filter((x) => soon(x.deadline, 14) && !['applied', 'funded', 'rejected', 'not_eligible'].includes(x.eligibility_status))) alerts.push({ level: soon(f.deadline, 7) ? 'red' : 'amber', text: `Funding deadline ${f.deadline}: ${f.name}.`, href: '/admin/funding' });
  for (const p of pilots.filter((x) => soon(x.extra?.pilot_end, 14))) alerts.push({ level: 'amber', text: `School pilot ends ${p.extra.pilot_end}: ${p.name}.`, href: '/admin/crm?group=institutions' });
  const expiring = paidAccess.filter((a) => soon(a.access_until, 14)).length;
  if (expiring) alerts.push({ level: 'amber', text: `${expiring} paid plan${expiring > 1 ? 's' : ''} end within 14 days (renewal chance).`, href: '/admin/students' });
  const openTasksOver = d.tasks.filter((t) => t.status === 'open' && t.due && t.due < today).length;
  if (openTasksOver) alerts.push({ level: 'amber', text: `${openTasksOver} founder task${openTasksOver > 1 ? 's' : ''} overdue.`, href: '/admin/tasks' });
  if (eco.status === 'review_pricing') alerts.push({ level: 'red', text: 'REVIEW PRICING: a handwritten evaluation costs more than it earns at your current assumptions.', href: '/admin/commercial' });
  if (hwPapers >= 5 && failedPapers / hwPapers > 0.1) alerts.push({ level: 'red', text: `High evaluation failure rate: ${failedPapers} of ${hwPapers} papers failed.`, href: '/admin/handwriting' });
  if (rag.handwritten_human_review === 'red') alerts.push({ level: 'amber', text: `${humanRate}% of handwritten answers need a teacher: costly.`, href: '/admin/handwriting' });
  if (rag.diagnostic_completion === 'red') alerts.push({ level: 'amber', text: `Low diagnostic completion (${diagCompletion}%).`, href: '/admin/funnel' });
  if (rag.weekly_active === 'red') alerts.push({ level: 'amber', text: 'Low weekly learning engagement.', href: '/admin/metrics' });
  const prevMonth = rangeBounds('month', {}, new Date(now.getTime() - 32 * DAY));
  const aiNow = snapshotCosts.month.aiList, aiPrev = costsIn({ from: prevMonth.from, to: rMonth.from }).aiList;
  if (aiPrev > 0 && aiNow > aiPrev * 1.25 && now.getUTCDate() >= 10) alerts.push({ level: 'amber', text: 'AI cost (at list prices) is more than 25% above last month already.', href: '/admin/ai-costs' });
  const aiRising = aiPrev > 0 && aiNow > aiPrev * 1.25;

  // ---- what should I do next ----
  const actions: Action[] = [];
  const add = (priority: number, text: string, href?: string) => actions.push({ priority, text, href });
  if (pend.length) add(1, `Verify the ${pend.length} pending payment${pend.length > 1 ? 's' : ''} so families get what they paid for.`, '/admin/payments');
  if (od + fod) add(2, `Do the ${od + fod} overdue follow-up${od + fod > 1 ? 's' : ''} first: warm leads go cold quickly.`, '/admin/crm');
  if (!d.expenses.length) add(3, 'Record your costs (Expenses). Until you do, profit and CAC cannot be shown.', '/admin/expenses');
  if (studentsTotal >= 20 && paidConversion !== null && rag.paid_conversion !== 'green') add(3, 'Many people use Sahayak but few pay. Review the paid offer, the contextual prompts and the willingness-to-pay answers.', '/admin/commercial');
  if (rag.diagnostic_completion === 'green' && (rag.weekly_active === 'red' || rag.weekly_active === 'amber')) add(3, 'Students finish the diagnostic but do not keep learning. Improve what happens right after the diagnostic.', '/admin/funnel');
  if (eco.status === 'review_pricing') add(1, 'Handwritten evaluation loses money at your assumptions: reduce the image limit or revise the price.', '/admin/commercial');
  const b2bWin = typeRows.filter((t) => ['tutor', 'centre'].includes(t.kind) && t.leads >= 3 && (t.conversion ?? 0) > (typeRows[0].conversion ?? 0));
  if (b2bWin.length) add(4, 'Tutors / centres convert better than families in your own CRM: consider prioritising B2B outreach.', '/admin/crm');
  if (institutions.length && !pilots.length) add(4, 'You have school leads but no pilot. Propose a 4-6 week pilot with 20-50 students: the first goal is evidence.', '/admin/crm?group=institutions');
  if (pilots.length) add(5, 'Check each pilot against its scorecard before proposing a paid institutional agreement.', '/admin/crm?group=institutions');
  if (!investors.length) add(6, 'Start an investor research list (only facts you have verified; mark the rest UNKNOWN).', '/admin/funding');
  else if (payers < 10 || !meetings) add(6, 'Investor pipeline is early. Build traction (paying users, retention) before pushing for meetings.', '/admin/funding');
  if (docsMissing) add(7, `${docsMissing} funding documents are missing or need updating.`, '/admin/funding/documents');
  if (aiRising) add(5, 'AI cost is rising. Check which feature is driving it.', '/admin/ai-costs');
  actions.sort((a, b) => a.priority - b.priority);

  return {
    range: { key: range.key, label: range.label }, generatedAt: now.toISOString(), productStage: settings.business.product_stage, health, rag,
    today: {
      students: M(studentsTotal), activeToday: M(dau), families: M(parentIds.size), paidAccounts: M(paidStudents.size), tutors: M(adultsBy('tutor').length), centres: M(adultsBy('centre').length),
      schools: M(institutions.length), pilots: M(pilots.length),
      revenueToday: M(revToday), revenueMonth: M(revMonth), revenueYear: M(revYear),
      costsToday: M(snapshotCosts.today.recorded || snapshotCosts.today.aiBilled > 0 ? snapshotCosts.today.total : null), costsMonth: M(snapshotCosts.month.recorded || snapshotCosts.month.aiBilled > 0 ? snapshotCosts.month.total : null),
      contributionMonth: M(snapshotCosts.month.recorded || revMonth > 0 ? revMonth - snapshotCosts.month.variable : null, 'ESTIMATED'), profitMonth: M(snapshotCosts.month.recorded || revMonth > 0 ? revMonth - snapshotCosts.month.total : null, 'ESTIMATED', 'Only costs you recorded, plus AI cost read from usage'),
    },
    users: {
      registered: M(d.users.length), students: M(roleCount('student')), parents: M(roleCount('parent')), tutors: M(roleCount('tutor')), centres: M(roleCount('centre')), newStudents: M(regStudents),
      dau: M(dau), wau: M(wau), mau: M(mau), activation: M(activation, 'ACTUAL', 'Share of students who finished a diagnostic'), returnRate: M(returnRate, 'ACTUAL', 'Came back within 7 days of the first session', rag.return_within_7_days),
      diagnosticCompletion: M(diagCompletion, 'ACTUAL', undefined, rag.diagnostic_completion), paidConversion: M(paidConversion, 'ACTUAL', 'Paid accounts / all students', rag.paid_conversion),
    },
    revenue: { total: M(revRange), byProduct, byType, byMethod, handwritten: M(revHandwritten), institutional: M(revInstitutional) },
    costs: { total: M(c.recorded || c.aiBilled > 0 ? c.total : null), byCategory: c.by, aiBilled: M(c.aiBilled), aiListEstimate: M(c.aiList, 'ESTIMATED', 'What these AI calls would cost at public prices (even on a free tier)'), variable: M(c.variable), other: M(c.other) },
    margins: { contribution: M(contribution, 'ESTIMATED'), profit: M(profit, 'ESTIMATED'), contributionMargin: M(contributionMargin, 'ESTIMATED', undefined, rag.contribution_margin) },
    unit, funnel, sources, learning: { avgMasteryChange: M(avgChange, 'ACTUAL', finished.length < 10 ? 'Needs at least 10 finished sessions' : `${finished.length} finished sessions`), sessionsFinished: M(finished.length) },
    handwritten: { humanReviewPercent: M(humanRate, 'ACTUAL', undefined, rag.handwritten_human_review), failedPapers: M(failedPapers), papers: M(hwPapers), economics: eco, economicsLabel: (eco.status === 'insufficient_data' ? 'INSUFFICIENT' : 'ASSUMED') as DataLabel },
    b2b: { tutorsActive: M(adultsBy('tutor').filter((a) => a.status === 'active').length), tutorsPending: M(adultsBy('tutor').filter((a) => a.status === 'pending').length), centresActive: M(adultsBy('centre').filter((a) => a.status === 'active').length), centresPending: M(adultsBy('centre').filter((a) => a.status === 'pending').length), paidOrgPlans: M(d.orgPlans.filter((o) => o.status === 'active' && (!o.access_until || o.access_until >= today)).length), schools: M(institutions.length), pilots: M(pilots.length), institutionalRevenue: M(revInstitutional) },
    crm: { open: M(crmOpen.length), byStage: crmByStage, potential: M(crmPipe.potential, 'ASSUMED'), weighted: M(crmPipe.weighted, 'ASSUMED', 'Uses your assumed stage probabilities'), overdue: M(od), dueToday: M(dt) },
    funding: { prospects: M(d.funding.length), byKind: fundByKind, byStage: fundByStage, meetings: M(meetings), potential: M(fundPipe.potential, 'ASSUMED'), weighted: M(fundPipe.weighted, 'ASSUMED', 'Uses your assumed stage probabilities'), committed: M(committed), received: M(received), govtApplications: M(applications('government')), incubatorApplications: M(applications('incubator') + applications('accelerator')), docsMissing: M(docsMissing), docsTotal: M(d.docs.length) },
    typeComparison: typeRows, alerts, actions: actions.slice(0, 8),
  };
}
export type CommandCentre = ReturnType<typeof computeCommandCentre>;

export async function loadCommandCentre(service: SupabaseClient, range: RangeBounds, now: Date = new Date()): Promise<CommandCentre> {
  const rows = async (table: string, cols = '*', limit = 50000) => { const { data } = await service.from(table).select(cols).limit(limit); return (data ?? []) as any[]; };
  const [settings, users, students, sessions, attempts, mocks, payments, revenueEntries, access, expenses, aiUsage, adults, orgPlans, links, crm, funding, tasks, evals, events, docs, products] = await Promise.all([
    loadSettings(service), rows('users', 'id, role, created_at, source'), rows('students', 'id, user_id, created_at'), rows('learning_sessions', 'student_id, started_at, status, starting_mastery, ending_mastery'),
    rows('diagnostic_attempts', 'student_id, status, started_at, completed_at'), rows('mock_exams', 'student_id, status, started_at, review_status'),
    rows('pilot_payments', 'student_id, amount, status, product_code, quantity, created_at, confirmed_at, payment_method'), rows('revenue_entries'),
    rows('student_access', 'student_id, plan_code, product_code, access_until'), rows('expenses'), rows('ai_usage', 'student_id, tier, provider, feature, ok, input_tokens, output_tokens, created_at', 100000),
    rows('adult_profiles', 'user_id, role, status'), rows('org_plans', 'user_id, status, access_until'), rows('student_links', 'adult_user_id, link_type, status').then((r) => r.filter((x) => x.status === 'active')),
    rows('crm_records'), rows('funding_records'), rows('founder_tasks'), rows('handwritten_evaluations', 'status, created_at'), rows('commerce_events', 'event, created_at'), rows('funding_documents', 'key, status'), rows('commerce_products', 'code, kind, price_inr'),
  ]);
  return computeCommandCentre({ users, students, sessions, attempts, mocks, payments, revenueEntries, access, expenses, aiUsage: aiUsage as UsageRow[], adults, orgPlans, links, crm, funding, tasks, evals, events, docs, products }, settings, range, now);
}
