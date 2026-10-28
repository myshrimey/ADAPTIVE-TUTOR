import { cleanSource, channelGroup, customerTypeOfRole, sourceLabel, ORGANIC_SOURCES, NOT_LINKED, type AcqSettings, type ReportingModel, DEFAULT_ACQ_SETTINGS } from './constants';
import { istDayOf, summariseTraffic, type ViewRow } from '../analytics/traffic';
import { buildUsageReport, freeProviderNames, type UsageRow } from '../ai-provider/usage';

// v76: all acquisition maths. PURE: takes rows already loaded by store.ts, returns numbers. Counts only; no names, no answers, no contact details leave this file.
// A rate is null ("Insufficient data") when its base is below the founder's minimum sample. A missing number is null, never 0.
const DAY = 86400000;
const PAID_FREE = new Set(['free', 'grandfathered', 'custom']);

export interface RawAcq {
  now: Date; settings: AcqSettings; siteBase: string; rewardsOn: boolean; daysReferrer: number; bonusDaysHeld: number;
  users: any[]; attrs: any[]; students: any[]; profiles: any[]; goals: any[]; subjects: any[]; attempts: any[]; baselines: any[]; sessions: any[];
  payments: any[]; access: any[]; revenue: any[]; saleLinks: any[]; refEvents: any[]; refCodes: any[]; oldReferrals: any[]; links: any[];
  partners: any[]; crm: any[]; campaigns: any[]; content: any[]; metrics: any[]; touches: any[]; views: any[]; expenses: any[]; usage: UsageRow[]; experiments: any[];
}
export interface Range { from: string | null; to: string | null; label?: string }
export interface AcqSegment { board?: string; grade?: string; state?: string; country?: string; subject?: string; type?: string }
export const UNKNOWN_SEGMENT = 'Unknown / not provided';

const inR = (iso: string | null | undefined, r: Range) => !!iso && !(r.from && iso < r.from) && !(r.to && iso >= r.to);
export const rate = (n: number, d: number, min: number): number | null => (d >= min && d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const uniq = <T,>(a: T[]) => [...new Set(a)];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export interface Key { source: string; campaign: string | null; content: string | null; partner: string | null }
export interface Person {
  userId: string; studentId: string | null; type: string; createdAt: string; month: string;
  first: Key; last: Key; referralCode: string | null; referrerUser: string | null; partner: string | null; hasAttr: boolean; matchedTouch: boolean; backfilled: boolean;
  board: string; grade: string; state: string; country: string; subject: string;
  diagStarted: boolean; diagDone: boolean; diagDoneAt: string | null; baseline: boolean; sessions: number; firstSession: string | null; secondSession: string | null;
  elig: { d1: boolean; d7: boolean; d30: boolean }; ret: { d1: boolean; d7: boolean; d30: boolean };
  planPaid: boolean; confirmedPaid: boolean; paid: boolean; paidAt: string | null; revenue: number; aiCost: number | null; paymentSource: string | null; activated: boolean;
}
const keyOf = (source: unknown, campaign: unknown, content: unknown, partner: unknown): Key => ({ source: cleanSource(source), campaign: campaign ? String(campaign) : null, content: content ? String(content) : null, partner: partner ? String(partner) : null });

export function buildPeople(raw: RawAcq): { people: Person[]; byUser: Map<string, Person>; byStudent: Map<string, Person> } {
  const now = raw.now.getTime();
  const attrOf = new Map<string, any>(raw.attrs.map((a) => [a.user_id, a]));
  const stuOf = new Map<string, any>(); for (const s of raw.students) stuOf.set(s.user_id, s);
  const prof = new Map<string, any>(raw.profiles.map((p) => [p.student_id, p]));
  const subj = new Map<string, string>(raw.subjects.map((s) => [s.id, s.name ?? s.slug ?? '']));
  const goalOf = new Map<string, string>(); for (const g of raw.goals) if (!goalOf.has(g.student_id)) goalOf.set(g.student_id, subj.get(g.subject_id) ?? '');
  const by = <T,>(rows: T[], f: (r: T) => string) => { const m = new Map<string, T[]>(); for (const r of rows) { const k = f(r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); } return m; };
  const attBy = by(raw.attempts, (a: any) => a.student_id), sesBy = by(raw.sessions, (a: any) => a.student_id), payBy = by(raw.payments, (a: any) => a.student_id);
  const baseSet = new Set(raw.baselines.map((b: any) => b.student_id));
  const accOf = new Map<string, any>(raw.access.map((a) => [a.student_id, a]));
  const today = istDayOf(now);
  const evOf = new Map<string, any>(); for (const e of raw.refEvents) evOf.set(e.referred_user, e);
  const stuUser = new Map<string, string>(raw.students.map((s) => [s.id, s.user_id]));
  const oldOf = new Map<string, any>(); for (const r of raw.oldReferrals) { const u = stuUser.get(r.referred_student); if (u) oldOf.set(u, r); }
  const codeOwner = new Map<string, string>(raw.refCodes.map((c) => [c.code, c.user_id]));
  const linkSales = by(raw.saleLinks.filter((l) => l.user_id), (l: any) => l.user_id);
  const revById = new Map<string, any>(raw.revenue.map((r) => [r.id, r]));
  const payById = new Map<string, any>(raw.payments.map((p) => [p.id, p]));
  const usage = buildUsageReport(raw.usage, freeProviderNames());
  const people: Person[] = [];
  for (const u of raw.users) {
    if (u.role === 'admin') continue;
    const a = attrOf.get(u.id); const st = stuOf.get(u.id) ?? null; const sid: string | null = st?.id ?? null;
    const utm = u.utm && typeof u.utm === 'object' ? u.utm : null;
    const fb = keyOf(u.source ?? 'unknown', utm?.campaign, null, null);
    const first = a?.first_source ? keyOf(a.first_source, a.first_campaign, a.first_content, a.partner_code) : fb;
    const last = a?.last_source ? keyOf(a.last_source, a.last_campaign, a.last_content, a.partner_code) : first;
    const ev = evOf.get(u.id); const old = oldOf.get(u.id);
    const referralCode: string | null = a?.referral_code ?? ev?.code ?? (old ? raw.refCodes.find((c) => c.user_id === stuUser.get(old.referrer_student))?.code ?? null : null);
    const referrerUser: string | null = a?.referrer_user ?? ev?.referrer_user ?? (old ? stuUser.get(old.referrer_student) ?? null : null) ?? (referralCode ? codeOwner.get(referralCode) ?? null : null);
    const pr = sid ? prof.get(sid) : null;
    const att = sid ? attBy.get(sid) ?? [] : []; const ses = sid ? (sesBy.get(sid) ?? []).map((s: any) => s.started_at).sort() as string[] : [];
    const pays = sid ? payBy.get(sid) ?? [] : []; const cpays = pays.filter((p: any) => p.status === 'confirmed');
    const acc = sid ? accOf.get(sid) : null; const planPaid = !!acc && !PAID_FREE.has(acc.plan_code) && (!acc.access_until || acc.access_until >= today);
    const sales = (linkSales.get(u.id) ?? []) as any[];
    const salesRev = sum(sales.filter((l) => l.revenue_entry_id && revById.get(l.revenue_entry_id)).map((l) => Number(revById.get(l.revenue_entry_id).amount_inr) || 0));
    const rev = sum(cpays.map((p: any) => Number(p.amount) || 0)) + salesRev;
    const saleTimes = sales.filter((l) => l.revenue_entry_id && revById.get(l.revenue_entry_id)?.received_on).map((l) => new Date(revById.get(l.revenue_entry_id).received_on + 'T00:00:00+05:30').toISOString());
    const payTimes = [...cpays.map((p: any) => p.confirmed_at ?? p.created_at), ...saleTimes].filter(Boolean).sort() as string[];
    const paidAt = payTimes[0] ?? null;
    const created = String(u.created_at ?? '');
    const t0 = ses.length ? Date.parse(ses[0]) : null;
    const returned = (nd: number) => t0 !== null && ses.some((s) => { const t = Date.parse(s); return t > t0 + 12 * 3600000 && t <= t0 + nd * DAY; });
    const elig = (nd: number) => t0 !== null && now - t0 >= nd * DAY;
    const sale0 = sales.find((l) => l.pilot_payment_id && payById.get(l.pilot_payment_id)) ?? sales[0];
    const diagDoneRows = att.filter((x: any) => x.status === 'completed');
    people.push({
      userId: u.id, studentId: sid, type: customerTypeOfRole(u.role), createdAt: created, month: created ? istDayOf(created).slice(0, 7) : '',
      first, last, referralCode, referrerUser, partner: a?.partner_code ?? null, hasAttr: !!a || !!u.source, matchedTouch: !!a?.matched_touch, backfilled: !a,
      board: pr?.school_board || UNKNOWN_SEGMENT, grade: st?.grade || (sid ? UNKNOWN_SEGMENT : '—'), state: pr?.school_state || UNKNOWN_SEGMENT, country: u.country || UNKNOWN_SEGMENT, subject: (sid && goalOf.get(sid)) || UNKNOWN_SEGMENT,
      diagStarted: att.length > 0, diagDone: diagDoneRows.length > 0, diagDoneAt: diagDoneRows.map((x: any) => x.completed_at ?? x.started_at).filter(Boolean).sort()[0] ?? null,
      baseline: !!sid && baseSet.has(sid), sessions: ses.length, firstSession: ses[0] ?? null, secondSession: ses[1] ?? null,
      elig: { d1: elig(1), d7: elig(7), d30: elig(30) }, ret: { d1: returned(1), d7: returned(7), d30: returned(30) },
      planPaid, confirmedPaid: cpays.length > 0 || salesRev > 0, paid: cpays.length > 0 || planPaid || salesRev > 0, paidAt, revenue: rev,
      aiCost: sid && usage.byStudent[sid] ? Math.round(usage.byStudent[sid].billedInr * 100) / 100 : null,
      paymentSource: sale0?.payment_source ? cleanSource(sale0.payment_source) : null, activated: ses.length >= 2,
    });
  }
  return { people, byUser: new Map(people.map((p) => [p.userId, p])), byStudent: new Map(people.filter((p) => p.studentId).map((p) => [p.studentId!, p])) };
}

export const matchesSegment = (p: Person, s: AcqSegment): boolean => {
  const eq = (v: string | undefined, x: string) => !v || v === 'all' || v === x;
  return eq(s.board, p.board) && eq(s.grade, p.grade) && eq(s.state, p.state) && eq(s.country, p.country) && eq(s.subject, p.subject) && eq(s.type, p.type);
};
/** Which source rows a person is counted under, for the chosen reporting model. A person can be under several only for "all_touches". */
export function keysFor(p: Person, model: ReportingModel): Key[] {
  if (model === 'first_touch') return [p.first];
  if (model === 'last_touch') return [p.last];
  if (model === 'referral') return p.referrerUser ? [{ source: 'referral', campaign: null, content: null, partner: null }] : [];
  const out: Key[] = [p.first, p.last]; if (p.referrerUser) out.push({ source: 'referral', campaign: null, content: null, partner: null }); if (p.partner) out.push({ source: 'partner', campaign: null, content: null, partner: p.partner });
  const seen = new Set<string>(); return out.filter((k) => { const s = `${k.source}|${k.campaign ?? ''}`; if (seen.has(s)) return false; seen.add(s); return true; });
}

export interface Row { key: string; label: string; people: number; students: number; diagStarted: number; diagDone: number; baseline: number; learning: number; activated: number; paid: number; confirmed: number; revenue: number; aiCost: number | null;
  ret1: { n: number; of: number; rate: number | null }; diagRate: number | null; activationRate: number | null; paidRate: number | null; revPerCustomer: number | null; ret7: { n: number; of: number; rate: number | null }; ret30: { n: number; of: number; rate: number | null }; visits: number | null; arrivals: number | null; arrivalsMatched: number | null; arrivalRate: number | null; organic: boolean }
const blank = (key: string, label: string): Row => ({ key, label, people: 0, students: 0, diagStarted: 0, diagDone: 0, baseline: 0, learning: 0, activated: 0, paid: 0, confirmed: 0, revenue: 0, aiCost: null, ret1: { n: 0, of: 0, rate: null }, diagRate: null, activationRate: null, paidRate: null, revPerCustomer: null, ret7: { n: 0, of: 0, rate: null }, ret30: { n: 0, of: 0, rate: null }, visits: null, arrivals: null, arrivalsMatched: null, arrivalRate: null, organic: false });
export function acqAggregate(people: Person[], keyFn: (p: Person) => { key: string; label: string }[], min: number): Row[] {
  const m = new Map<string, Row>();
  for (const p of people) for (const k of keyFn(p)) {
    const r = m.get(k.key) ?? m.set(k.key, blank(k.key, k.label)).get(k.key)!;
    r.people++;
    if (p.studentId) {
      r.students++; if (p.diagStarted) r.diagStarted++; if (p.diagDone) r.diagDone++; if (p.baseline) r.baseline++; if (p.sessions > 0) r.learning++; if (p.activated) r.activated++;
      if (p.paid) r.paid++; if (p.confirmedPaid) r.confirmed++; r.revenue += p.revenue; if (p.aiCost !== null) r.aiCost = (r.aiCost ?? 0) + p.aiCost;
      if (p.elig.d1) { r.ret1.of++; if (p.ret.d1) r.ret1.n++; }
      if (p.elig.d7) { r.ret7.of++; if (p.ret.d7) r.ret7.n++; } if (p.elig.d30) { r.ret30.of++; if (p.ret.d30) r.ret30.n++; }
    }
  }
  for (const r of m.values()) {
    r.diagRate = rate(r.diagDone, r.students, min); r.activationRate = rate(r.activated, r.students, min); r.paidRate = rate(r.paid, r.students, min);
    r.revPerCustomer = r.paid > 0 ? Math.round(r.revenue / r.paid) : null; r.ret1.rate = rate(r.ret1.n, r.ret1.of, min); r.ret7.rate = rate(r.ret7.n, r.ret7.of, min); r.ret30.rate = rate(r.ret30.n, r.ret30.of, min);
  }
  return [...m.values()];
}
export const sourceKey = (k: Key) => ({ key: k.source, label: sourceLabel(k.source) });
const bySignups = (a: Row, b: Row) => b.revenue - a.revenue || b.paid - a.paid || b.people - a.people || a.label.localeCompare(b.label);

/** Visits and tracked-link arrivals by source / campaign / content, from the first-party tables. Visits are unique per day, summed. */
export function trafficBy(raw: RawAcq, r: Range, field: 'source' | 'campaign' | 'content'): Map<string, { visits: number; arrivals: number; matched: number }> {
  const m = new Map<string, { visits: number; arrivals: number; matched: number }>(); const get = (k: string) => m.get(k) ?? m.set(k, { visits: 0, arrivals: 0, matched: 0 }).get(k)!;
  const seen = new Set<string>();
  for (const v of raw.views) { if (!inR(v.at, r)) continue; const raw0 = field === 'source' ? v.source : v[field]; if (!raw0) continue; const k = field === 'source' ? cleanSource(raw0) : String(raw0); const id = `${k}|${v.visitor}|${istDayOf(v.at)}`; if (seen.has(id)) continue; seen.add(id); get(k).visits++; }
  const arr = new Set<string>();
  for (const t of raw.touches) { if (!inR(t.at, r)) continue; const raw0 = field === 'source' ? t.source : t[field]; if (!raw0) continue; const k = field === 'source' ? cleanSource(raw0) : String(raw0); const id = `${k}|${t.anon}`; if (arr.has(id)) continue; arr.add(id); const e = get(k); e.arrivals++; if (t.user_id) e.matched++; }
  return m;
}
function withTraffic(rows: Row[], tb: Map<string, { visits: number; arrivals: number; matched: number }>, min: number, keyMap: (k: string) => string = (k) => k): Row[] {
  const seen = new Set<string>();
  for (const r of rows) { const t = tb.get(keyMap(r.key)); seen.add(keyMap(r.key)); if (t) { r.visits = t.visits; r.arrivals = t.arrivals; r.arrivalsMatched = t.matched; r.arrivalRate = rate(t.matched, t.arrivals, min); } }
  for (const [k, t] of tb) if (!seen.has(k)) { const r = blank(k, sourceLabel(k)); r.visits = t.visits; r.arrivals = t.arrivals; r.arrivalsMatched = t.matched; r.arrivalRate = rate(t.matched, t.arrivals, min); rows.push(r); }
  return rows;
}

export interface Dash { from: string | null; to: string | null }

// ---------- the report ----------
export interface Exec { label: string; visitors: number | null; sessions: number | null; registrations: number; studentSignups: number; diagnostics: number; activated: number; paidCustomers: number; revenue: number; referrals: number; referredCustomers: number }
export function executive(raw: RawAcq, people: Person[], r: Range, label: string): Exec {
  const rows = raw.views.filter((v) => inR(v.at, r)) as ViewRow[];
  let visitors: number | null = null, sessions: number | null = null;
  if (raw.views.length) {
    const fromDay = r.from ? istDayOf(r.from) : istDayOf(rows[0]?.at ?? raw.now.getTime()); const toDay = istDayOf(r.to ? Date.parse(r.to) - 1 : raw.now.getTime());
    const t = summariseTraffic(rows, fromDay, toDay).totals; visitors = t.visitors; sessions = t.sessions;
  }
  const users = raw.users.filter((u) => u.role !== 'admin' && inR(u.created_at, r));
  const diag = uniq(raw.attempts.filter((a: any) => a.status === 'completed' && inR(a.completed_at ?? a.started_at, r)).map((a: any) => a.student_id)).length;
  const act = people.filter((p) => p.studentId && inR(p.secondSession, r)).length;
  const paidP = people.filter((p) => p.paidAt && inR(p.paidAt, r));
  const linkedEntry = new Set(raw.saleLinks.filter((l) => l.revenue_entry_id && l.user_id).map((l) => l.revenue_entry_id));
  const orgSales = raw.revenue.filter((e) => e.received_on && inR(new Date(e.received_on + 'T00:00:00+05:30').toISOString(), r) && !linkedEntry.has(e.id)).length;
  const revenue = sum(raw.payments.filter((p) => p.status === 'confirmed' && inR(p.confirmed_at ?? p.created_at, r)).map((p) => Number(p.amount) || 0)) + sum(raw.revenue.filter((e) => e.received_on && inR(new Date(e.received_on + 'T00:00:00+05:30').toISOString(), r)).map((e) => Number(e.amount_inr) || 0));
  const refs = uniq([...raw.refEvents.filter((e) => inR(e.created_at, r)).map((e) => e.referred_user), ...raw.oldReferrals.filter((e) => inR(e.created_at, r)).map((e) => 'old:' + e.referred_student)]).length;
  return { label, visitors, sessions, registrations: users.length, studentSignups: users.filter((u) => u.role === 'student').length, diagnostics: diag, activated: act, paidCustomers: paidP.length + orgSales, revenue, referrals: refs, referredCustomers: paidP.filter((p) => p.referrerUser).length };
}

export interface Issue { key: string; title: string; count: number; severity: 'high' | 'medium' | 'low'; fix: string; href: string }
export function dataQuality(raw: RawAcq, people: Person[]): Issue[] {
  const now = raw.now.getTime(); const out: Issue[] = []; const add = (key: string, title: string, count: number, severity: Issue['severity'], fix: string, href: string) => { if (count > 0) out.push({ key, title, count, severity, fix, href }); };
  const students = people.filter((p) => p.studentId);
  add('missing_source', 'Accounts with no acquisition source recorded', people.filter((p) => p.first.source === 'unknown').length, 'medium', 'Older sign-ups before tracking cannot be fixed; for new ones check the links you share carry ?utm_source=', '/admin/social-growth');
  add('missing_campaign', 'Accounts from social/paid sources with no campaign', people.filter((p) => ['facebook', 'instagram', 'linkedin', 'youtube', 'telegram'].includes(p.first.source) && !p.first.campaign).length, 'low', 'Give every tracked link a campaign name', '/admin/social-growth');
  add('missing_utm', 'Tracked arrivals with a source but no campaign and no content', raw.touches.filter((t) => t.source && !t.campaign && !t.content).length, 'low', 'Use the tracked link from the Social Growth Engine instead of a plain link', '/admin/social-growth');
  const dupContact = (() => { const m = new Map<string, number>(); for (const u of raw.users) { const e = String(u.contact_email ?? '').trim().toLowerCase(); if (e) m.set(e, (m.get(e) ?? 0) + 1); } return [...m.values()].filter((c) => c > 1).length; })();
  add('dup_customer', 'Contact addresses used by more than one account (possible duplicate customer)', dupContact, 'low', 'Check /admin/students; families may legitimately share one parent address', '/admin/students');
  const stuUser = new Map<string, string>(raw.students.map((s) => [s.id, s.user_id]));
  const dupRef = (() => { let n = 0; for (const o of raw.oldReferrals) { const ev = raw.refEvents.find((e) => e.referred_user === stuUser.get(o.referred_student)); if (ev && ev.referrer_user !== stuUser.get(o.referrer_student)) n++; } return n; })();
  add('dup_referral', 'People who used two different invite codes', dupRef, 'medium', 'Decide by hand which referrer counts', '/admin/engagement/referrals');
  add('pay_no_source', 'Paid customers with no acquisition source', students.filter((p) => p.paid && p.first.source === 'unknown').length, 'medium', 'Ask the family how they heard of Sahayak and record it on the sale', '/admin/acquisition#sales');
  add('sale_no_account', 'Sales recorded with a source but not tied to any account', raw.saleLinks.filter((l) => !l.user_id && l.payment_source).length, 'low', 'Fine for tutors/centres/schools; for families, link the account', '/admin/acquisition#sales');
  const campIds = new Set(raw.content.map((c) => c.campaign_id).filter(Boolean));
  add('camp_no_content', 'Campaigns with no posts', raw.campaigns.filter((c) => !campIds.has(c.id) && c.status !== 'archived').length, 'low', 'Create posts for the campaign or archive it', '/admin/social-growth');
  add('no_site_base', 'Website address is not set, so no post has a tracked link', raw.siteBase ? 0 : 1, 'high', 'Enter the website address in Social Growth settings', '/admin/social-growth');
  add('content_no_campaign', 'Published posts with no campaign', raw.content.filter((c) => c.status === 'PUBLISHED' && !c.campaign_id).length, 'low', 'Attach the post to a campaign', '/admin/social-growth');
  const codes = new Set(raw.refCodes.map((c) => c.code));
  add('sale_bad_ref', 'Sales quoting a referral code that does not exist', raw.saleLinks.filter((l) => l.referral_code && !codes.has(l.referral_code)).length, 'medium', 'Correct the code on the sale', '/admin/acquisition#sales');
  const linkedPay = new Set(raw.saleLinks.map((l) => l.pilot_payment_id).filter(Boolean));
  add('paid_no_confirmation', 'Paid plan with no confirmed payment record', students.filter((p) => p.planPaid && !p.confirmedPaid).length, 'medium', 'Record the payment at /admin/payments (or confirm it was a free grant)', '/admin/payments');
  const linkedEntry = new Set(raw.saleLinks.filter((l) => l.revenue_entry_id && (l.user_id || l.partner_code)).map((l) => l.revenue_entry_id));
  add('revenue_unlinked', 'Money received that is not linked to a customer or partner', raw.revenue.filter((e) => !linkedEntry.has(e.id)).length, 'medium', 'Open the entry in Offline sales and link it', '/admin/acquisition#sales');
  const bad = people.filter((p) => { const f = p.first, l = p.last; return !!p.createdAt && Date.parse(p.createdAt) > now + DAY; }).length
    + raw.attrs.filter((a) => (a.first_at && a.last_at && a.last_at < a.first_at) || (a.first_at && Date.parse(a.first_at) > now + DAY)).length
    + raw.payments.filter((p) => p.status === 'confirmed' && p.confirmed_at && p.created_at && p.confirmed_at < p.created_at).length
    + raw.payments.filter((p) => p.pilot_start_date && p.pilot_end_date && p.pilot_end_date < p.pilot_start_date).length
    + raw.touches.filter((t) => Date.parse(t.at) > now + DAY).length;
  add('bad_dates', 'Impossible dates (in the future, or end before start)', bad, 'high', 'Correct the record at the page it came from', '/admin/payments');
  void linkedPay;
  return out.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]) || b.count - a.count);
}

export interface ReferrerRow { code: string; role: string; signups: number; diagDone: number; activated: number; paid: number; revenue: number; quality: number }
export interface PartnerRow { code: string; kind: string; status: string; rewardStatus: string; studentRevenue: number; attributed: number; linked: number; students: number; diagDone: number; activated: number; paid: number; revenue: number }
export interface ContentRow { id: string; slug: string; platform: string; campaign: string | null; audience: string; pillar: string | null; cta: string | null; status: string; publishedAt: string | null; impressions: number | null; clicks: number | null; engagement: number | null; arrivals: number | null; visits: number | null; signups: number; diagnostics: number; customers: number; revenue: number; referrals: number; score: number }
export interface CampaignRow extends Row { slug: string; name: string; budget: number | null; spend: number | null; cac: number | null }
export interface SourceRow extends Row { spend: number | null; cac: number | null; ltvToCac: number | null }
export interface Sale { source: string; kind: string; partner: string | null; campaign: string | null; amount: number; date: string }
export interface Cohort extends Row { month: string }
export interface ExperimentResult { id: string; name: string; metric: string; status: string; aN: number; bN: number; aValue: number | null; bValue: number | null; verdict: string }
export interface AcqAction { priority: number; text: string; href?: string }
export interface Chain { who: string; steps: { label: string; value: string }[]; revenue: number }

export interface Report {
  generatedAt: string; model: ReportingModel; range: Range; minSample: number; segment: AcqSegment;
  exec: Exec[]; selected: Exec;
  funnel: { stage: string; count: number | null; note?: string; label: 'ACTUAL' | 'CALCULATED' | 'MANUAL' | 'INSUFFICIENT DATA' }[];
  sources: SourceRow[]; channels: Row[]; campaigns: CampaignRow[]; content: ContentRow[];
  referral: { codes: number; invitationsNote: string; redemptions: number; qualified: number; referrers: number; activeReferrers: number; signups: number; diagDone: number; activated: number; paid: number; revenue: number; pending: number; approved: number; declined: number; liabilityDays: number; liabilityDaysEstimated: boolean; liabilityMoney: null; topBySignups: ReferrerRow[]; topByActivated: ReferrerRow[]; topByRevenue: ReferrerRow[]; topByQuality: ReferrerRow[]; rewardsOn: boolean };
  partners: PartnerRow[]; customerTypes: { type: string; label: string; accounts: number; leads: number | null; meetings: number | null; pilots: number | null; active: number | null; students: number | null; revenue: number | null }[];
  studentEconomics: { signups: number; paid: number; conversion: number | null; revenue: number; revPerCustomer: number | null; ret7: number | null; referralRate: number | null; cac: number | null };
  cohorts: { bySource: Cohort[]; byCampaign: Cohort[]; byType: Cohort[] };
  sales: { bySource: { source: string; label: string; amount: number; count: number }[]; recent: Sale[]; total: number };
  business: { revenue: number; customers: number; revPerCustomer: number | null; aiCost: number | null; teacherCost: number | null; contribution: number | null; margin: number | null; spendTagged: number | null; cac: number | null; ltvToDate: number | null; ltvToCac: number | null; cacNote: string; referralRevenue: number; liabilityDays: number };
  quality: Issue[]; actions: AcqAction[]; insights: string[]; experiments: ExperimentResult[]; chains: Chain[];
  segments: { boards: string[]; grades: string[]; states: string[]; countries: string[]; subjects: string[] };
  visitorsNote: string; trackedLinkMatch: { arrivals: number; matched: number; rate: number | null };
}

const mnames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m: string) => (/^\d{4}-\d{2}$/.test(m) ? `${mnames[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` : m);
const quality = (r: { people: number; diagDone: number; activated: number; paid: number }, w: AcqSettings['weights']) => w.signup * r.people + w.diagnostic * r.diagDone + w.active * r.activated + w.paid * r.paid;
const dist = (xs: string[]) => uniq(xs).filter((x) => x && x !== '—').sort((a, b) => (a === UNKNOWN_SEGMENT ? 1 : b === UNKNOWN_SEGMENT ? -1 : a.localeCompare(b)));

export function buildReport(raw: RawAcq, opts: { range: Range; rangeLabel?: string; model?: ReportingModel; segment?: AcqSegment } = { range: { from: null, to: null } }): Report {
  const set = raw.settings ?? DEFAULT_ACQ_SETTINGS; const min = set.minSample; const model = opts.model ?? set.model; const range = opts.range; const seg = opts.segment ?? {};
  const { people: all, byUser, byStudent } = buildPeople(raw);
  const people = all.filter((p) => matchesSegment(p, seg) && inR(p.createdAt, range));
  const nowMs = raw.now.getTime(); const day = (d: number) => new Date(nowMs - d * DAY);
  const istStart = (d: number) => { const t = new Date(nowMs + 330 * 60000); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - d) - 330 * 60000).toISOString(); };
  const fixed: [string, Range][] = [['Today', { from: istStart(0), to: null }], ['7 days', { from: istStart(6), to: null }], ['30 days', { from: istStart(29), to: null }], ['90 days', { from: istStart(89), to: null }]];
  void day;
  const exec = fixed.map(([l, r]) => executive(raw, all, r, l)); const selected = executive(raw, all, range, opts.rangeLabel ?? 'Selected period');

  // spend tagged to a source or campaign (cash only). Founder time is never turned into money.
  const spendBy = { source: new Map<string, number>(), campaign: new Map<string, number>() };
  for (const e of raw.expenses) { if (!['marketing', 'referral'].includes(e.category)) continue; if (!inR(e.spent_on ? new Date(e.spent_on + 'T00:00:00+05:30').toISOString() : null, range) && !(range.from === null && range.to === null)) continue; const amt = Number(e.amount_inr) || 0; if (e.acq_source) spendBy.source.set(cleanSource(e.acq_source), (spendBy.source.get(cleanSource(e.acq_source)) ?? 0) + amt); if (e.acq_campaign) spendBy.campaign.set(String(e.acq_campaign), (spendBy.campaign.get(String(e.acq_campaign)) ?? 0) + amt); }

  // by source
  const srcBase = acqAggregate(people, (p) => keysFor(p, model).map(sourceKey), min); // visits/arrivals belong to the link someone arrived by, so they are not attached under the referral model
  const srcRows = (model === 'referral' ? srcBase : withTraffic(srcBase, trafficBy(raw, range, 'source'), min)) as SourceRow[];
  for (const r of srcRows) { const sp = spendBy.source.get(r.key) ?? null; r.organic = ORGANIC_SOURCES.has(r.key); r.spend = sp; r.cac = sp && r.paid > 0 ? Math.round(sp / r.paid) : null; r.ltvToCac = r.cac && r.revPerCustomer ? Math.round((r.revPerCustomer / r.cac) * 10) / 10 : null; }
  srcRows.sort(bySignups);
  const channelRows = acqAggregate(people, (p) => keysFor(p, model).map((k) => { const g = channelGroup(k.source); return { key: g, label: g === 'other' ? 'Other' : sourceLabel(g) }; }), min);
  const tb = trafficBy(raw, range, 'source'); const gv = new Map<string, { visits: number; arrivals: number; matched: number }>();
  for (const [k, t] of tb) { const g = channelGroup(k); const e = gv.get(g) ?? gv.set(g, { visits: 0, arrivals: 0, matched: 0 }).get(g)!; e.visits += t.visits; e.arrivals += t.arrivals; e.matched += t.matched; }
  withTraffic(channelRows, gv, min); channelRows.sort(bySignups);

  // campaigns
  const campMeta = new Map<string, any>(raw.campaigns.map((c) => [c.slug, c]));
  const campRows = withTraffic(acqAggregate(people, (p) => keysFor(p, model).filter((k) => k.campaign).map((k) => ({ key: k.campaign!, label: k.campaign! })), min), trafficBy(raw, range, 'campaign'), min) as CampaignRow[];
  for (const r of campRows) { const m = campMeta.get(r.key); r.slug = r.key; r.name = m?.name ?? r.key; r.label = r.name; r.budget = m?.budget_inr != null ? Number(m.budget_inr) : null; const sp = spendBy.campaign.get(r.key) ?? null; r.spend = sp; r.cac = sp && r.paid > 0 ? Math.round(sp / r.paid) : null; }
  campRows.sort(bySignups);

  // content
  const refMade = new Map<string, number>(); for (const p of all) if (p.referrerUser) refMade.set(p.referrerUser, (refMade.get(p.referrerUser) ?? 0) + 1);
  const ctb = trafficBy(raw, range, 'content'); const metBy = new Map<string, any[]>(); for (const m of raw.metrics) (metBy.get(m.content_id) ?? metBy.set(m.content_id, []).get(m.content_id)!).push(m);
  const campName = new Map<string, string>(raw.campaigns.map((c) => [c.id, c.name]));
  const known = (v: any) => (v === null || v === undefined ? null : Number(v) || 0);
  const contentRows: ContentRow[] = raw.content.filter((c) => !c.archived && ['PUBLISHED', 'APPROVED'].includes(c.status)).map((c) => {
    const ms = metBy.get(c.id) ?? []; const sumN = (f: string) => (ms.some((m) => m[f] !== null && m[f] !== undefined) ? sum(ms.map((m) => Number(m[f]) || 0)) : null);
    const mine = people.filter((p) => keysFor(p, model).some((k) => k.content === c.slug)); const t = ctb.get(c.slug);
    const eng = ms.length ? sum(['likes', 'comments', 'shares', 'saves'].map((f) => sumN(f) ?? 0)) : null;
    const row = { people: mine.length, diagDone: mine.filter((p) => p.diagDone).length, activated: mine.filter((p) => p.activated).length, paid: mine.filter((p) => p.paid).length };
    return { id: c.id, slug: c.slug, platform: c.platform, campaign: c.campaign_id ? campName.get(c.campaign_id) ?? null : null, audience: c.audience, pillar: c.pillar ?? null, cta: c.cta ?? null, status: c.status, publishedAt: c.published_at ?? null,
      impressions: sumN('impressions'), clicks: sumN('clicks'), engagement: eng, arrivals: t ? t.arrivals : null, visits: t ? t.visits : null, signups: mine.length, diagnostics: row.diagDone, customers: row.paid, revenue: sum(mine.map((p) => p.revenue)), referrals: sum(mine.map((p) => refMade.get(p.userId) ?? 0)), score: quality(row, set.weights) };
  }).sort((a, b) => b.revenue - a.revenue || b.customers - a.customers || b.signups - a.signups || b.diagnostics - a.diagnostics || (b.clicks ?? -1) - (a.clicks ?? -1) || (b.engagement ?? -1) - (a.engagement ?? -1));
  void known;

  // referral
  const role = new Map<string, string>(raw.users.map((u) => [u.id, u.role])); const codeOf = new Map<string, string>(raw.refCodes.map((c) => [c.user_id, c.code]));
  const referredAll = all.filter((p) => p.referrerUser); const referredIn = people.filter((p) => p.referrerUser);
  const rmap = new Map<string, ReferrerRow>();
  for (const p of referredIn) { const id = p.referrerUser!; const r = rmap.get(id) ?? rmap.set(id, { code: codeOf.get(id) ?? p.referralCode ?? '—', role: role.get(id) ?? 'student', signups: 0, diagDone: 0, activated: 0, paid: 0, revenue: 0, quality: 0 }).get(id)!; r.signups++; if (p.diagDone) r.diagDone++; if (p.activated) r.activated++; if (p.paid) r.paid++; r.revenue += p.revenue; }
  const referrers = [...rmap.values()].map((r) => ({ ...r, quality: quality({ people: r.signups, diagDone: r.diagDone, activated: r.activated, paid: r.paid }, set.weights) }));
  const top = (f: (r: ReferrerRow) => number) => [...referrers].sort((a, b) => f(b) - f(a) || b.quality - a.quality).filter((r) => f(r) > 0).slice(0, 5);
  const evR = raw.refEvents.filter((e) => inR(e.created_at, range)); const oldR = raw.oldReferrals.filter((e) => inR(e.created_at, range));
  const pending = evR.filter((e) => ['qualified', 'held'].includes(e.status)).length + oldR.filter((e) => e.reward_status === 'under_review').length;
  const approved = evR.filter((e) => e.status === 'rewarded').length + oldR.filter((e) => e.reward_status === 'approved').length;
  const declined = evR.filter((e) => e.status === 'blocked').length + oldR.filter((e) => e.reward_status === 'declined').length;
  const estDays = raw.rewardsOn ? pending * raw.daysReferrer : 0;
  const referral = {
    codes: raw.refCodes.length, invitationsNote: 'Not tracked: how many times a link was shared is not recorded.', redemptions: uniq([...raw.refEvents.filter((e) => inR(e.created_at, range)).map((e) => e.referred_user), ...oldR.map((e) => 'old:' + e.referred_student)]).length,
    qualified: evR.filter((e) => e.status !== 'signed_up' && e.status !== 'blocked').length, referrers: referrers.length, activeReferrers: referrers.filter((r) => r.signups > 0).length,
    signups: referredIn.length, diagDone: referredIn.filter((p) => p.diagDone).length, activated: referredIn.filter((p) => p.activated).length, paid: referredIn.filter((p) => p.paid).length, revenue: sum(referredIn.map((p) => p.revenue)),
    pending, approved, declined, liabilityDays: raw.bonusDaysHeld + estDays, liabilityDaysEstimated: estDays > 0, liabilityMoney: null as null,
    topBySignups: top((r) => r.signups), topByActivated: top((r) => r.activated), topByRevenue: top((r) => r.revenue), topByQuality: top((r) => r.quality), rewardsOn: raw.rewardsOn,
  };

  // partners
  const stuByCode = new Map<string, Set<string>>(); const linkedBy = new Map<string, Set<string>>();
  for (const p of all) if (p.studentId) for (const code of uniq([p.partner, p.first.partner, p.last.partner].filter(Boolean) as string[])) (stuByCode.get(code) ?? stuByCode.set(code, new Set()).get(code)!).add(p.studentId);
  const sSalesByPartner = new Map<string, number>(); for (const l of raw.saleLinks) if (l.partner_code && !l.user_id && l.revenue_entry_id) { const e = raw.revenue.find((x) => x.id === l.revenue_entry_id); if (e) sSalesByPartner.set(l.partner_code, (sSalesByPartner.get(l.partner_code) ?? 0) + (Number(e.amount_inr) || 0)); }
  const partnerRows: PartnerRow[] = raw.partners.map((pt) => {
    const att = stuByCode.get(pt.code) ?? new Set<string>(); const lk = new Set<string>(pt.user_id ? raw.links.filter((l) => l.adult_user_id === pt.user_id && l.status === 'active').map((l) => l.student_id) : []);
    const ids = uniq([...att, ...lk]); const ps = ids.map((i) => byStudent.get(i)).filter(Boolean) as Person[];
    const studRev = sum(ps.map((p) => p.revenue)); return { code: pt.code, kind: pt.kind, status: pt.status ?? 'lead', rewardStatus: pt.reward_status ?? 'none', studentRevenue: studRev, attributed: att.size, linked: lk.size, students: ids.length, diagDone: ps.filter((p) => p.diagDone).length, activated: ps.filter((p) => p.activated).length, paid: ps.filter((p) => p.paid).length, revenue: studRev + (sSalesByPartner.get(pt.code) ?? 0) };
  }).sort((a, b) => b.revenue - a.revenue || b.students - a.students);

  // customer types
  const crmKinds: Record<string, string[]> = { tutor: ['tutor'], coaching_centre: ['centre'], school: ['school'], government_school: ['govt_school', 'govt_institution'] };
  const pKind: Record<string, string[]> = { tutor: ['tutor'], coaching_centre: ['centre'], school: ['school'], government_school: ['govt_school'] };
  const typeRows = (['student', 'family', 'tutor', 'coaching_centre', 'school', 'government_school', 'other'] as const).map((t) => {
    const accounts = all.filter((p) => p.type === t && inR(p.createdAt, range)).length; const org = !!crmKinds[t];
    const ps = org ? partnerRows.filter((p) => pKind[t].includes(p.kind)) : [];
    const kindMap: Record<string, string> = { tutor: 'tutor', coaching_centre: 'centre', school: 'school', government_school: 'govt_school' };
    const salesKind = org ? sum(raw.revenue.filter((e) => e.customer_kind === kindMap[t] || (t === 'government_school' && e.customer_kind === 'govt_institution')).filter((e) => e.received_on && inR(new Date(e.received_on + 'T00:00:00+05:30').toISOString(), range)).map((e) => Number(e.amount_inr) || 0)) : null;
    return { type: t, label: t === 'student' ? 'Students' : t === 'family' ? 'Parents / families' : t === 'tutor' ? 'Tutors' : t === 'coaching_centre' ? 'Coaching centres' : t === 'school' ? 'Schools' : t === 'government_school' ? 'Government schools / institutions' : 'Other', accounts,
      leads: org ? raw.crm.filter((c) => crmKinds[t].includes(c.kind)).length : null, meetings: org ? raw.partners.filter((p) => pKind[t].includes(p.kind) && p.status === 'meeting').length : null, pilots: org ? raw.partners.filter((p) => pKind[t].includes(p.kind) && p.status === 'pilot').length : null, active: org ? raw.partners.filter((p) => pKind[t].includes(p.kind) && p.status === 'active').length : null,
      students: org ? sum(ps.map((p) => p.students)) : null, revenue: org ? sum(ps.map((p) => p.studentRevenue)) + (salesKind ?? 0) : null };
  });

  // student economics
  const studs = people.filter((p) => p.studentId); const paidS = studs.filter((p) => p.paid);
  const el7 = studs.filter((p) => p.elig.d7);
  const taggedKeys = [...spendBy.source.keys()]; const taggedSpend = sum([...spendBy.source.values()]) + sum([...spendBy.campaign.values()]);
  const taggedCustomers = paidS.filter((p) => taggedKeys.includes(p.first.source) || (p.first.campaign && spendBy.campaign.has(p.first.campaign))).length;
  const cac = taggedSpend > 0 && taggedCustomers > 0 ? Math.round(taggedSpend / taggedCustomers) : null;
  const studentEconomics = { signups: studs.length, paid: paidS.length, conversion: rate(paidS.length, studs.length, min), revenue: sum(studs.map((p) => p.revenue)), revPerCustomer: paidS.length ? Math.round(sum(paidS.map((p) => p.revenue)) / paidS.length) : null, ret7: rate(el7.filter((p) => p.ret.d7).length, el7.length, min), referralRate: rate(studs.filter((p) => raw.refEvents.some((e) => e.referrer_user === p.userId)).length, studs.length, min), cac };

  // cohorts (all people, not limited by the period; segment still applies)
  const coh = (kf: (p: Person) => { key: string; label: string }[]) => acqAggregate(all.filter((p) => matchesSegment(p, seg) && p.month), (p) => kf(p).map((k) => ({ key: `${p.month}|${k.key}`, label: `${monthLabel(p.month)} ${k.label} cohort` })), min).map((r) => ({ ...r, month: r.key.split('|')[0] })).sort((a, b) => b.month.localeCompare(a.month) || b.people - a.people) as Cohort[];
  const cohorts = { bySource: coh((p) => keysFor(p, model).map(sourceKey)), byCampaign: coh((p) => keysFor(p, model).filter((k) => k.campaign).map((k) => ({ key: k.campaign!, label: k.campaign! }))), byType: coh((p) => [{ key: p.type, label: p.type.replace(/_/g, ' ') }]) };

  // sales not tied to an account
  const linkOf = new Map<string, any>(); for (const l of raw.saleLinks) if (l.revenue_entry_id) linkOf.set(l.revenue_entry_id, l);
  const standalone: Sale[] = raw.revenue.filter((e) => !linkOf.get(e.id)?.user_id && e.received_on && inR(new Date(e.received_on + 'T00:00:00+05:30').toISOString(), range)).map((e) => { const l = linkOf.get(e.id); return { source: cleanSource(l?.payment_source ?? 'unknown'), kind: e.customer_kind, partner: l?.partner_code ?? null, campaign: l?.campaign ?? null, amount: Number(e.amount_inr) || 0, date: e.received_on }; });
  const sbs = new Map<string, { source: string; label: string; amount: number; count: number }>(); for (const s of standalone) { const e = sbs.get(s.source) ?? sbs.set(s.source, { source: s.source, label: sourceLabel(s.source), amount: 0, count: 0 }).get(s.source)!; e.amount += s.amount; e.count++; }
  const sales = { bySource: [...sbs.values()].sort((a, b) => b.amount - a.amount), recent: standalone.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20), total: sum(standalone.map((s) => s.amount)) };

  // business
  const usageIn = buildUsageReport(raw.usage.filter((u) => inR(u.created_at, range)), freeProviderNames());
  const exp = (cats: string[]) => raw.expenses.filter((e) => cats.includes(e.category) && (range.from === null && range.to === null ? true : inR(e.spent_on ? new Date(e.spent_on + 'T00:00:00+05:30').toISOString() : null, range)));
  const teacherRows = exp(['teacher', 'evaluator', 'reviewer']); const teacher = teacherRows.length ? sum(teacherRows.map((e) => Number(e.amount_inr) || 0)) : null;
  const aiCost = raw.usage.length ? Math.round(usageIn.total.billedInr * 100) / 100 : null;
  const revenue = selected.revenue; const custPaid = all.filter((p) => p.paid); const ltvToDate = custPaid.length ? Math.round(sum(custPaid.map((p) => p.revenue)) / custPaid.length) : null;
  const contribution = revenue > 0 && (aiCost !== null || teacher !== null) ? Math.round((revenue - (aiCost ?? 0) - (teacher ?? 0)) * 100) / 100 : null;
  const business = { revenue, customers: selected.paidCustomers, revPerCustomer: selected.paidCustomers ? Math.round(revenue / selected.paidCustomers) : null, aiCost, teacherCost: teacher, contribution, margin: contribution !== null && revenue > 0 ? Math.round((contribution / revenue) * 1000) / 10 : null,
    spendTagged: taggedSpend > 0 ? taggedSpend : null, cac, ltvToDate, ltvToCac: cac && ltvToDate ? Math.round((ltvToDate / cac) * 10) / 10 : null,
    cacNote: taggedSpend > 0 ? (cac ? 'Cash spent that you tagged to a source or campaign, divided by paying customers from those. Founder time and unpaid posting are not counted.' : 'Spend is tagged but no paying customer came from it yet.') : 'Not available: no marketing spend has been tagged to a source or campaign. Organic work (your time, WhatsApp, referrals) has no cash cost recorded, so it is not shown as "free" or as zero.',
    referralRevenue: referral.revenue, liabilityDays: referral.liabilityDays };

  const qualityIssues = dataQuality(raw, all);
  const experiments = evaluateExperiments(raw, all, min);
  const chains = buildChains(all, byUser, refMade);
  const ta = raw.touches.filter((t) => inR(t.at, range)); const arrivals = uniq(ta.map((t) => t.anon)).length; const matched = uniq(ta.filter((t) => t.user_id).map((t) => t.anon)).length;
  const funnelCount = (n: number | null, label: 'ACTUAL' | 'CALCULATED' | 'MANUAL' = 'ACTUAL', note?: string) => ({ count: n, note, label: n === null ? ('INSUFFICIENT DATA' as const) : label });
  const manualImpr = raw.metrics.some((m) => m.impressions != null) ? sum(raw.metrics.filter((m) => inR(m.metric_date ? m.metric_date + 'T00:00:00+05:30' : null, range)).map((m) => Number(m.impressions) || 0)) : null;
  const manualClicks = raw.metrics.some((m) => m.clicks != null) ? sum(raw.metrics.filter((m) => inR(m.metric_date ? m.metric_date + 'T00:00:00+05:30' : null, range)).map((m) => Number(m.clicks) || 0)) : null;
  const ps = people.filter((p) => p.studentId);
  const funnel = [
    { stage: 'Content impressions (typed in by you)', ...funnelCount(manualImpr, 'MANUAL', 'From the results you enter on each post.') },
    { stage: 'Content clicks (typed in by you)', ...funnelCount(manualClicks, 'MANUAL') },
    { stage: 'Website visits (unique per day)', ...funnelCount(selected.visitors, 'ACTUAL', 'First-party counter. ' + VN) },
    { stage: 'Tracked-link arrivals', ...funnelCount(arrivals, 'ACTUAL', 'Arrivals through links with ?utm_source= etc.') },
    { stage: 'Sign-ups (all accounts)', ...funnelCount(people.length) },
    { stage: 'Student accounts', ...funnelCount(ps.length) },
    { stage: 'Diagnostic started', ...funnelCount(ps.filter((p) => p.diagStarted).length) },
    { stage: 'Diagnostic completed', ...funnelCount(ps.filter((p) => p.diagDone).length) },
    { stage: 'Baseline created', ...funnelCount(ps.filter((p) => p.baseline).length) },
    { stage: 'First learning session', ...funnelCount(ps.filter((p) => p.sessions > 0).length) },
    { stage: 'Second learning session (activated)', ...funnelCount(ps.filter((p) => p.activated).length) },
    { stage: '7-day return', ...funnelCount(ps.filter((p) => p.ret.d7).length, 'ACTUAL', `${ps.filter((p) => p.elig.d7).length} old enough to measure`) },
    { stage: '30-day return', ...funnelCount(ps.filter((p) => p.ret.d30).length, 'ACTUAL', `${ps.filter((p) => p.elig.d30).length} old enough to measure`) },
    { stage: 'Paid (plan or payment)', ...funnelCount(ps.filter((p) => p.paid).length) },
    { stage: 'Payment confirmed', ...funnelCount(ps.filter((p) => p.confirmedPaid).length) },
    { stage: 'Revenue (₹)', ...funnelCount(sum(ps.map((p) => p.revenue)), 'ACTUAL', 'Confirmed payments and linked sales of these people.') },
    { stage: 'Referrals created (people who joined through an invite)', ...funnelCount(referral.signups) },
    { stage: 'Referred: diagnostic completed', ...funnelCount(referral.diagDone) },
    { stage: 'Referred: active (2+ sessions)', ...funnelCount(referral.activated) },
    { stage: 'Referred: paid', ...funnelCount(referral.paid) },
    { stage: 'Referral revenue (₹)', ...funnelCount(referral.revenue) },
  ];
  const ins = buildAcqInsights({ srcRows, referral, partnerRows, contentRows, issues: qualityIssues, people, min, studentEconomics, raw, selected });
  void referredAll;
  return {
    generatedAt: raw.now.toISOString(), model, range, minSample: min, segment: seg, exec, selected, funnel, sources: srcRows, channels: channelRows, campaigns: campRows, content: contentRows, referral, partners: partnerRows, customerTypes: typeRows, studentEconomics, cohorts, sales, business,
    quality: qualityIssues, actions: ins.actions, insights: ins.insights, experiments, chains,
    segments: { boards: dist(all.filter((p) => p.studentId).map((p) => p.board)), grades: dist(all.filter((p) => p.studentId).map((p) => p.grade)), states: dist(all.filter((p) => p.studentId).map((p) => p.state)), countries: dist(all.map((p) => p.country)), subjects: dist(all.filter((p) => p.studentId).map((p) => p.subject)) },
    visitorsNote: VN, trackedLinkMatch: { arrivals, matched, rate: rate(matched, arrivals, min) },
  };
}
const VN = 'Visitors and registrations are not directly matched.';

function metricOf(ps: Person[], metric: string, arrivals: { n: number; m: number }, min: number): number | null {
  const st = ps.filter((p) => p.studentId);
  switch (metric) {
    case 'signup_rate': return rate(arrivals.m, arrivals.n, min);
    case 'diagnostic_completion': return rate(st.filter((p) => p.diagDone).length, st.length, min);
    case 'activation': return rate(st.filter((p) => p.activated).length, st.length, min);
    case 'd7_retention': { const e = st.filter((p) => p.elig.d7); return rate(e.filter((p) => p.ret.d7).length, e.length, min); }
    case 'paid_conversion': return rate(st.filter((p) => p.paid).length, st.length, min);
    case 'revenue_per_customer': { const pd = st.filter((p) => p.paid); return pd.length >= min ? Math.round(sum(pd.map((p) => p.revenue)) / pd.length) : null; }
    default: return null;
  }
}
export function evaluateExperiments(raw: RawAcq, all: Person[], min: number): ExperimentResult[] {
  return raw.experiments.map((x) => {
    const pick = (v: string | null) => {
      if (!v) return { ps: [] as Person[], a: { n: 0, m: 0 } };
      const inWin = (iso: string) => (!x.start_date || iso >= new Date(x.start_date + 'T00:00:00+05:30').toISOString()) && (!x.end_date || iso < new Date(new Date(x.end_date + 'T00:00:00+05:30').getTime() + DAY).toISOString());
      const ps = all.filter((p) => (p.first.campaign === v || p.first.content === v) && inWin(p.createdAt));
      const tt = raw.touches.filter((t) => (t.campaign === v || t.content === v) && inWin(t.at)); const anons = uniq(tt.map((t) => t.anon));
      return { ps, a: { n: anons.length, m: uniq(tt.filter((t) => t.user_id).map((t) => t.anon)).length } };
    };
    const A = pick(x.variant_a), B = pick(x.variant_b);
    const base = (r: { ps: Person[]; a: { n: number; m: number } }) => (x.metric === 'signup_rate' ? r.a.n : r.ps.filter((p) => p.studentId).length);
    const av = metricOf(A.ps, x.metric, A.a, min), bv = metricOf(B.ps, x.metric, B.a, min);
    const verdict = av === null || bv === null ? `Insufficient data: each variant needs at least ${min} people (A has ${base(A)}, B has ${base(B)}).` : av === bv ? 'No difference measured.' : `${av > bv ? 'A' : 'B'} is higher by ${Math.round(Math.abs(av - bv) * 10) / 10}${x.metric === 'revenue_per_customer' ? ' ₹' : ' points'}. This is an association from your own links, not proof that the variant caused it.`;
    return { id: x.id, name: x.name, metric: x.metric, status: x.status, aN: base(A), bN: base(B), aValue: av, bValue: bv, verdict };
  });
}
function buildChains(all: Person[], byUser: Map<string, Person>, refMade: Map<string, number>): Chain[] {
  const short = (id: string) => id.replace(/-/g, '').slice(0, 4).toUpperCase();
  const stage = (p: Person) => [
    { label: 'Source', value: `${sourceLabel(p.first.source)}${p.first.campaign ? ' / ' + p.first.campaign : ''}${p.first.content ? ' / ' + p.first.content : ''}` },
    { label: 'Tracked visit matched', value: p.matchedTouch ? 'Yes' : NOT_LINKED }, { label: 'Signed up', value: p.createdAt.slice(0, 10) }, { label: 'Diagnostic', value: p.diagDone ? 'Completed' : p.diagStarted ? 'Started' : 'Not started' },
    { label: 'Baseline', value: p.baseline ? 'Created' : 'Not yet' }, { label: 'Learning sessions', value: String(p.sessions) }, { label: 'Paid', value: p.paid ? `Yes, ₹${p.revenue}` : 'No' },
  ];
  const out: Chain[] = [];
  for (const p of all) {
    if (!p.studentId || !(p.paid || refMade.get(p.userId))) continue;
    const kids = all.filter((c) => c.referrerUser === p.userId);
    const steps = stage(p); steps.push({ label: 'Referral code', value: p.referralCode ? 'Has used one' : kids.length ? 'Shared' : 'None' });
    kids.slice(0, 3).forEach((k, i) => steps.push({ label: `Referred person ${i + 1}`, value: `signed up ${k.createdAt.slice(0, 10)}; diagnostic ${k.diagDone ? 'completed' : 'not completed'}; ${k.paid ? 'paid ₹' + k.revenue : 'not paid'}` }));
    out.push({ who: 'Account ' + short(p.userId), steps, revenue: p.revenue + sum(kids.map((k) => k.revenue)) });
  }
  void byUser;
  return out.sort((a, b) => b.revenue - a.revenue).slice(0, 12);
}

export function buildAcqInsights(c: { srcRows: SourceRow[]; referral: Report['referral']; partnerRows: PartnerRow[]; contentRows: ContentRow[]; issues: Issue[]; people: Person[]; min: number; studentEconomics: Report['studentEconomics']; raw: RawAcq; selected: Exec }): { actions: AcqAction[]; insights: string[] } {
  const { min } = c; const acts: AcqAction[] = []; const ins: string[] = []; const A = (priority: number, text: string, href?: string) => acts.push({ priority, text, href });
  const real = c.srcRows.filter((r) => r.students >= min && r.key !== 'unknown');
  const overallAct = rate(c.people.filter((p) => p.activated).length, c.people.filter((p) => p.studentId).length, min);
  const overallPaid = rate(c.people.filter((p) => p.paid).length, c.people.filter((p) => p.studentId).length, min);
  if (!c.raw.siteBase) A(1, 'Enter your website address in Social Growth settings. Until then no post has a tracked link, so no post can be tied to a sign-up.', '/admin/social-growth');
  const high = c.issues.filter((i) => i.severity === 'high' && i.key !== 'no_site_base'); if (high.length) A(2, `Fix data problem: ${high[0].title} (${high[0].count}).`, high[0].href);
  if (real.length === 0) { ins.push(`Insufficient data: no source has ${min} student sign-ups in this period yet, so no channel is ranked.`); A(9, 'Not enough data to determine the best acquisition channel. Keep sharing tracked links; this page ranks channels once a source has ' + min + ' sign-ups.'); }
  else {
    const bestDiag = [...real].filter((r) => r.diagRate !== null).sort((a, b) => b.diagRate! - a.diagRate!)[0];
    if (bestDiag) { ins.push(`${bestDiag.label} has the highest diagnostic completion (${bestDiag.diagRate}% of ${bestDiag.students} students).`); A(4, `${bestDiag.label} has the highest diagnostic completion (${bestDiag.diagRate}%). Make 3 more posts or links for this source.`, '/admin/social-growth'); }
    for (const r of real) {
      if (r.activationRate !== null && overallAct !== null && r.activationRate < overallAct * 0.5 && r.students >= min) { ins.push(`${r.label} brought ${r.students} students but only ${r.activated} reached a second session (${r.activationRate}% against ${overallAct}% overall).`); A(3, `${r.label} brings sign-ups but few activated learners (${r.activationRate}%). Review onboarding for people from this source.`, '/admin/acquisition'); }
      if (r.paidRate !== null && overallPaid !== null && r.paidRate > overallPaid && r.paid >= 2) { ins.push(`${r.label} has a higher paid conversion (${r.paidRate}%) than overall (${overallPaid}%). This is an association.`); }
    }
    const bestPaid = [...real].filter((r) => r.paidRate !== null && r.paid >= 2).sort((a, b) => b.paidRate! - a.paidRate!)[0]; if (bestPaid) A(5, `${bestPaid.label} has the highest paid conversion (${bestPaid.paidRate}%). Spend your next hour there.`);
  }
  const ref = c.srcRows.find((r) => r.key === 'referral');
  if (c.people.length >= min && (c.referral.signups < min)) A(6, `Referral volume is low (${c.referral.signups} in this period). Add a referral prompt after a meaningful learning milestone.`, '/admin/engagement/referrals');
  if (ref && ref.paidRate !== null && overallPaid !== null && ref.paidRate > overallPaid) ins.push('Referred people pay more often than others. Consider a clearer invite prompt (rewards stay a manual decision).');
  for (const p of c.partnerRows) if (p.students >= min) { const ar = rate(p.activated, p.students, min); if (ar !== null && ar >= 40) A(5, `${p.code} brought ${p.students} students with ${ar}% activation. Consider more partners like this.`, '/admin/acquisition#partners'); }
  const byPlat = new Map<string, { eng: number; posts: number }>(); for (const r of c.contentRows) { if (r.engagement === null) continue; const e = byPlat.get(r.platform) ?? byPlat.set(r.platform, { eng: 0, posts: 0 }).get(r.platform)!; e.eng += r.engagement; e.posts++; }
  for (const [plat, e] of byPlat) { const brought = c.srcRows.find((r) => r.key === plat); if (e.posts >= 3 && e.eng > 0 && !(brought && brought.people > 0)) { ins.push(`${plat} posts get engagement but no sign-ups are tied to them.`); A(6, `${plat} gets engagement but no measurable sign-ups. Test the call to action and the landing page.`, '/admin/social-growth'); } }
  const sorted = acts.sort((a, b) => a.priority - b.priority).slice(0, 5);
  if (!sorted.length) sorted.push({ priority: 9, text: 'Not enough data to decide. Keep going and check again next week.' });
  return { actions: sorted, insights: ins.slice(0, 10) };
}
