import type { SupabaseClient } from '@supabase/supabase-js';
import { listPriceInr, billedInr, freeProviderNames } from '../ai-provider/usage';

// Founder-only commercial funnel and unit economics (master prompt v3, sec. 37-39).
// Counts only what the database really holds. Stages Sahayak cannot see (content, website visits,
// referrals) are listed as "not tracked here" instead of guessed. Uses the SERVICE client: the
// caller must already have passed the admin check. Definitions: docs/COMMERCIAL_METRICS.md.

const DAY = 86400000;
const ACTIVE_SESSIONS_14D = 3; // "active user" = at least 3 learning sessions in the last 14 days
const PAID_FREE_PLANS = new Set(['free', 'grandfathered', 'custom']);

export interface FunnelStage {
  key: string;
  label: string;
  count: number | null; // null = not tracked in the database
  note?: string;
}

export interface StudentSheetRow {
  student: string;
  plan: string;
  start_date: string;
  subjects_chosen: number;
  sessions: number;
  last_active: string;
  diagnostic_status: 'not started' | 'in progress' | 'completed';
  mock_attempts: number;
  report_viewed: 'yes' | 'no';
}

export interface SalesSheetRow {
  student: string;
  offer: string;
  amount_inr: number;
  payment_method: string;
  upi_reference: string;
  verified: 'yes' | 'no' | 'rejected';
  activation_start: string;
  expiry: string;
  created: string;
}

export interface ProductSheetRow {
  student: string;
  sessions: number;
  questions_answered: number;
  accuracy_percent: number | null;
  independent_accuracy_percent: number | null; // correct with no hint
  latest_confidence: number | null;
  mock_average_percent: number | null;
}

export interface Economics {
  month: string;
  revenueInr: number;
  paidStudents: number;
  aiCostListInr: number;
  aiCostBilledInr: number;
  teacherReviews: number;
  teacherRateInr: number;
  teacherCostInr: number;
  contributionInr: number | null;
  grossMarginPercent: number | null;
  perPaidStudent: { revenue: number; aiList: number; teacher: number; contribution: number } | null;
  note: string;
}

export interface SheetData {
  generatedAt: string;
  funnel: FunnelStage[];
  students: StudentSheetRow[];
  sales: SalesSheetRow[];
  product: ProductSheetRow[];
  economics: Economics;
}

/**
 * Pure. Revenue minus AI cost and teacher cost, over revenue. Gross margin is null (not zero)
 * when there is no revenue to divide by: "insufficient evidence", not a made-up percentage.
 * `aiCost` should be the list price (what it would cost at public prices), the safe planning number.
 */
export function computeEconomics(p: { month: string; revenueInr: number; paidStudents: number; aiCostListInr: number; aiCostBilledInr: number; teacherReviews: number; teacherRateInr: number }): Economics {
  const teacherCostInr = p.teacherReviews * p.teacherRateInr;
  const contributionInr = p.revenueInr > 0 ? p.revenueInr - p.aiCostListInr - teacherCostInr : null;
  const gross = p.revenueInr > 0 && contributionInr !== null ? Math.round((contributionInr / p.revenueInr) * 1000) / 10 : null;
  const n = p.paidStudents;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    ...p,
    teacherCostInr,
    contributionInr,
    grossMarginPercent: gross,
    perPaidStudent:
      n > 0 && p.revenueInr > 0
        ? { revenue: r2(p.revenueInr / n), aiList: r2(p.aiCostListInr / n), teacher: r2(teacherCostInr / n), contribution: r2((contributionInr ?? 0) / n) }
        : null,
    note:
      p.revenueInr > 0
        ? 'Revenue is confirmed payments recorded in this month. AI cost uses public list prices (even where a free tier is used). Teacher cost = reviews x the rate you entered. Support time is not included.'
        : 'No confirmed payment recorded in this month, so no margin is shown (insufficient evidence).',
  };
}

/** Pure. Spreadsheet-safe CSV: quotes everything that needs it and defuses cells that start like a formula. */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n';
}

async function pageAll<T = any>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null }>, max = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data } = await q(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function monthRangeUtcIst(month: string): { from: string; to: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1) - 5.5 * 3600000).toISOString();
  const to = new Date(Date.UTC(y, m, 1) - 5.5 * 3600000).toISOString();
  return { from, to };
}

export async function loadSheetData(service: SupabaseClient, opts: { month: string; teacherRateInr: number }, now: Date = new Date()): Promise<SheetData> {
  const range = monthRangeUtcIst(opts.month) ?? monthRangeUtcIst(new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(0, 7))!;

  const [studentRows, accessRows, attempts, sessions, mocks, goals, viewed, pays, qa, checkins] = await Promise.all([
    pageAll((a, b) => service.from('students').select('id, display_name, created_at').order('created_at').range(a, b)),
    pageAll((a, b) => service.from('student_access').select('student_id, plan_code').range(a, b)),
    pageAll((a, b) => service.from('diagnostic_attempts').select('student_id, status').range(a, b)),
    pageAll((a, b) => service.from('learning_sessions').select('student_id, started_at').range(a, b)),
    pageAll((a, b) => service.from('mock_exams').select('student_id, status, score, total').range(a, b)),
    pageAll((a, b) => service.from('learning_goals').select('student_id, subject_id').eq('status', 'active').range(a, b)),
    pageAll((a, b) => service.from('learning_events').select('student_id').eq('event_type', 'report_viewed').range(a, b)),
    pageAll((a, b) => service.from('pilot_payments').select('student_id, offer_label, amount, status, transaction_reference, pilot_start_date, pilot_end_date, created_at, confirmed_at').order('created_at').range(a, b)),
    pageAll((a, b) => service.from('question_attempts').select('student_id, is_correct, hints_used').range(a, b)),
    pageAll((a, b) => service.from('session_checkins').select('student_id, confidence_after, confidence_before, created_at').order('created_at', { ascending: false }).range(a, b)),
  ]);

  const nameOf = new Map<string, string>(studentRows.map((s: any) => [s.id, s.display_name as string]));
  const planOf = new Map<string, string>(accessRows.map((a: any) => [a.student_id, a.plan_code as string]));
  const label = (id: string) => nameOf.get(id) ?? id.slice(0, 8);

  const group = <T extends { student_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.student_id, [...(m.get(r.student_id) ?? []), r]);
    return m;
  };
  const sessBy = group<any>(sessions);
  const mockBy = group<any>(mocks);
  const goalBy = group<any>(goals);
  const qaBy = group<any>(qa);
  const diagBy = group<any>(attempts);
  const viewedSet = new Set(viewed.map((v: any) => v.student_id));
  const latestConf = new Map<string, number>();
  for (const c of checkins as any[]) {
    if (latestConf.has(c.student_id)) continue;
    const v = c.confidence_after ?? c.confidence_before;
    if (v != null) latestConf.set(c.student_id, Number(v));
  }

  const confirmedPaid = new Set<string>(pays.filter((p: any) => p.status === 'confirmed').map((p: any) => p.student_id));
  for (const [id, plan] of planOf) if (!PAID_FREE_PLANS.has(plan)) confirmedPaid.add(id);

  const t14 = now.getTime() - 14 * DAY;
  const active = new Set<string>();
  for (const [id, rows] of sessBy) if (rows.filter((r: any) => new Date(r.started_at).getTime() >= t14).length >= ACTIVE_SESSIONS_14D) active.add(id);

  const started = new Set(attempts.map((a: any) => a.student_id));
  const completed = new Set(attempts.filter((a: any) => a.status === 'completed').map((a: any) => a.student_id));
  const learned = new Set(sessions.map((s: any) => s.student_id));
  const retained = [...confirmedPaid].filter((id) => active.has(id)).length;

  const funnel: FunnelStage[] = [
    { key: 'content', label: 'Content reached', count: null, note: 'Not tracked in Sahayak. Record views, saves and DMs in your Google Sheet.' },
    { key: 'visit', label: 'Website visits', count: null, note: 'Not tracked in Sahayak. Use the Vercel Analytics page if you want visit counts.' },
    { key: 'signup', label: 'Students created', count: studentRows.length },
    { key: 'diag_start', label: 'Assessment started', count: started.size },
    { key: 'diag_done', label: 'Assessment completed', count: completed.size },
    { key: 'report', label: 'Report viewed', count: viewedSet.size, note: 'Counted from v42 onwards only.' },
    { key: 'learn', label: 'Learning started', count: learned.size },
    { key: 'active', label: `Active (${ACTIVE_SESSIONS_14D}+ sessions in 14 days)`, count: active.size },
    { key: 'paid', label: 'Paid (confirmed payment or paid plan)', count: confirmedPaid.size },
    { key: 'retained', label: 'Paid and still active', count: retained },
    { key: 'referral', label: 'Referrals', count: null, note: 'Not tracked yet. Ask each family how they heard of Sahayak and note it in your sheet.' },
  ];

  const students: StudentSheetRow[] = studentRows.map((s: any) => {
    const ss = (sessBy.get(s.id) ?? []).map((r: any) => r.started_at).sort();
    const d = diagBy.get(s.id) ?? [];
    return {
      student: label(s.id),
      plan: planOf.get(s.id) ?? 'none',
      start_date: String(s.created_at).slice(0, 10),
      subjects_chosen: new Set((goalBy.get(s.id) ?? []).map((g: any) => g.subject_id)).size,
      sessions: ss.length,
      last_active: ss.length ? ss[ss.length - 1].slice(0, 10) : '',
      diagnostic_status: d.some((x: any) => x.status === 'completed') ? 'completed' : d.length ? 'in progress' : 'not started',
      mock_attempts: (mockBy.get(s.id) ?? []).filter((m: any) => m.status === 'submitted').length,
      report_viewed: viewedSet.has(s.id) ? 'yes' : 'no',
    };
  });

  const sales: SalesSheetRow[] = pays.map((p: any) => ({
    student: label(p.student_id),
    offer: p.offer_label,
    amount_inr: Number(p.amount),
    payment_method: 'UPI / offline',
    upi_reference: p.transaction_reference ?? '',
    verified: p.status === 'confirmed' ? 'yes' : p.status === 'rejected' ? 'rejected' : 'no',
    activation_start: p.pilot_start_date ?? '',
    expiry: p.pilot_end_date ?? '',
    created: String(p.created_at).slice(0, 10),
  }));

  const product: ProductSheetRow[] = studentRows.map((s: any) => {
    const a = qaBy.get(s.id) ?? [];
    const pct = (n: number, d: number) => (d >= 10 ? Math.round((n / d) * 100) : null); // fewer than 10 answers = insufficient evidence
    const mm = (mockBy.get(s.id) ?? []).filter((m: any) => m.status === 'submitted' && Number(m.total) > 0);
    return {
      student: label(s.id),
      sessions: (sessBy.get(s.id) ?? []).length,
      questions_answered: a.length,
      accuracy_percent: pct(a.filter((x: any) => x.is_correct).length, a.length),
      independent_accuracy_percent: pct(a.filter((x: any) => x.is_correct && !x.hints_used).length, a.length),
      latest_confidence: latestConf.get(s.id) ?? null,
      mock_average_percent: mm.length ? Math.round(mm.reduce((t: number, m: any) => t + (Number(m.score) / Number(m.total)) * 100, 0) / mm.length) : null,
    };
  });

  // Economics for the chosen month.
  const aiRows = await pageAll((a, b) => service.from('ai_usage').select('provider, input_tokens, output_tokens').gte('created_at', range.from).lt('created_at', range.to).range(a, b), 100000);
  const free = freeProviderNames();
  let aiList = 0;
  let aiBilled = 0;
  for (const r of aiRows as any[]) {
    aiList += listPriceInr(r.provider, r.input_tokens, r.output_tokens);
    aiBilled += billedInr(r.provider, r.input_tokens, r.output_tokens, free);
  }
  const { count: reviews } = await service.from('content_reviews').select('id', { count: 'exact', head: true }).gte('updated_at', range.from).lt('updated_at', range.to);
  const revenue = pays
    .filter((p: any) => p.status === 'confirmed' && p.confirmed_at && p.confirmed_at >= range.from && p.confirmed_at < range.to)
    .reduce((t: number, p: any) => t + Number(p.amount), 0);
  const paidInMonth = new Set(pays.filter((p: any) => p.status === 'confirmed' && p.confirmed_at && p.confirmed_at >= range.from && p.confirmed_at < range.to).map((p: any) => p.student_id)).size;

  return {
    generatedAt: now.toISOString(),
    funnel,
    students,
    sales,
    product,
    economics: computeEconomics({ month: opts.month, revenueInr: revenue, paidStudents: paidInMonth, aiCostListInr: Math.round(aiList * 100) / 100, aiCostBilledInr: Math.round(aiBilled * 100) / 100, teacherReviews: reviews ?? 0, teacherRateInr: opts.teacherRateInr }),
  };
}
