import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanSource, cleanAcqSettings, PARTNER_PREFIX, PARTNER_KINDS, PARTNER_STATUS, PARTNER_REWARD_STATUS, EXPERIMENT_METRICS, customerTypeOfRole, type AcqSettings } from './constants';
import { type Touch } from './touch';
import { type RawAcq } from './compute';
import { loadSocialSettings, siteBase, saveCampaign } from '../social-growth';
import { loadReferralSettings } from '../referral/referral';
import type { UsageRow } from '../ai-provider/usage';
import { istDayOf } from '../analytics/traffic';

// v76: database layer. Server only (service client); the caller has already passed the admin check, or is a sign-up route that writes only ids from the session it just created.
const friendly = (what: string, e?: any) => new Error(`Could not ${what}.${/does not exist|schema cache|relation/i.test(String(e?.message ?? '')) ? ' Run the latest database update (0048).' : ' Please try again.'}`);
const clean = (v: unknown, n: number): string | null => { const s = String(v ?? '').trim().slice(0, n); return s || null; };
const ymd = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function loadAcqSettings(service: SupabaseClient): Promise<AcqSettings> {
  try { const { data } = await service.from('commerce_settings').select('value').eq('key', 'acquisition').maybeSingle(); return cleanAcqSettings(data?.value); } catch { return cleanAcqSettings(null); }
}
export async function saveAcqSettings(service: SupabaseClient, raw: unknown): Promise<AcqSettings> {
  const s = cleanAcqSettings(raw);
  const { error } = await service.from('commerce_settings').upsert({ key: 'acquisition', value: s, note: 'v76 acquisition engine', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw friendly('save the settings', error); return s;
}

// ---------- capture ----------
/** One row per (device, day, source, campaign, content, partner). A repeat is silently ignored. Never throws. */
export async function recordTouch(service: SupabaseClient, anon: string, t: Touch, referralCode: string | null = null): Promise<'recorded' | 'duplicate' | 'error'> {
  try {
    if (!anon || !t.source) return 'error';
    const at = t.at && !Number.isNaN(Date.parse(t.at)) ? t.at : new Date().toISOString();
    const { error } = await service.from('acquisition_touches').insert({ anon, at, touch_day: istDayOf(at), source: t.source, medium: t.medium, campaign: t.campaign, content: t.content, term: t.term, landing: t.landing, partner_code: t.partner, referral_code: referralCode });
    if (!error) return 'recorded';
    return /duplicate|unique|23505/i.test(String(error.message ?? error.code ?? '')) ? 'duplicate' : 'error';
  } catch { return 'error'; }
}
export interface SignupInput { userId: string; role: string; anon: string | null; first: Touch | null; last: Touch | null; referralCode?: string | null }
/** Called right after a new account exists. Stores first touch (never changed afterwards), last touch, partner, post and campaign; matches earlier tracked arrivals of the same device to this account. Never throws: attribution must never stop a sign-up. */
export async function captureSignupAttribution(service: SupabaseClient, i: SignupInput): Promise<{ stored: boolean; matched: boolean }> {
  try {
    let first = i.first, last = i.last || i.first, matched = false;
    if (i.anon) {
      const { data: ts } = await service.from('acquisition_touches').select('id, at, source, medium, campaign, content, term, landing, partner_code').eq('anon', i.anon).is('user_id', null).order('at', { ascending: true }).limit(200);
      const rows = (ts ?? []) as any[];
      if (rows.length) {
        matched = true; const asT = (r: any): Touch => ({ source: cleanSource(r.source), medium: r.medium, campaign: r.campaign, content: r.content, term: r.term, landing: r.landing, partner: r.partner_code, ref: null, at: r.at });
        if (!first) first = asT(rows[0]); if (!last) last = asT(rows[rows.length - 1]);
        await service.from('acquisition_touches').update({ user_id: i.userId }).eq('anon', i.anon).is('user_id', null);
      }
    }
    let referrer: string | null = null; let code: string | null = i.referralCode ?? null;
    try { const { data: ev } = await service.from('referral_events').select('code, referrer_user').eq('referred_user', i.userId).maybeSingle(); if (ev) { referrer = ev.referrer_user; code = code ?? ev.code; } } catch { /* optional */ }
    const partnerRaw = first?.partner ?? last?.partner ?? null; let partner: string | null = null;
    if (partnerRaw) { const { data: p } = await service.from('acq_partners').select('code').eq('code', partnerRaw).maybeSingle(); partner = p?.code ?? null; }
    let contentId: string | null = null, campaignId: string | null = null;
    if (first?.content) { const { data: c } = await service.from('social_content').select('id, campaign_id').eq('slug', first.content).maybeSingle(); contentId = c?.id ?? null; campaignId = c?.campaign_id ?? null; }
    if (!campaignId && first?.campaign) { const { data: c } = await service.from('social_campaigns').select('id').eq('slug', first.campaign).maybeSingle(); campaignId = c?.id ?? null; }
    if (!first && !referrer && !partner) { // nothing tracked: still record that the arrival was direct, so "direct" is a fact and not a guess
      const { error } = await service.from('acquisition_attribution').insert({ user_id: i.userId, customer_type: customerTypeOfRole(i.role), first_source: 'direct', last_source: 'direct', first_at: new Date().toISOString(), last_at: new Date().toISOString(), matched_touch: false });
      return { stored: !error, matched };
    }
    const f = first ?? { source: referrer ? 'referral' : 'partner', medium: null, campaign: null, content: null, term: null, landing: null, partner, ref: null, at: new Date().toISOString() } as Touch;
    const l = last ?? f; const iso = (t: Touch) => t.at || new Date().toISOString();
    const row = { user_id: i.userId, customer_type: customerTypeOfRole(i.role), first_source: f.source, first_medium: f.medium, first_campaign: f.campaign, first_content: f.content, first_term: f.term, first_landing: f.landing, first_at: iso(f),
      last_source: l.source, last_medium: l.medium, last_campaign: l.campaign, last_content: l.content, last_term: l.term, last_landing: l.landing, last_at: iso(l),
      referral_code: code, referrer_user: referrer, partner_code: partner, social_content_id: contentId, campaign_id: campaignId, matched_touch: matched };
    const { error } = await service.from('acquisition_attribution').insert(row);
    if (error && /duplicate|unique|23505/i.test(String(error.message ?? ''))) return { stored: false, matched }; // first touch is never overwritten
    return { stored: !error, matched };
  } catch (e: any) { console.error('acquisition capture failed', e?.message); return { stored: false, matched: false }; }
}

// ---------- loading ----------
async function pageAll(q: (a: number, b: number) => PromiseLike<{ data: any[] | null; error?: any }>, max = 50000): Promise<{ rows: any[]; ok: boolean }> {
  const out: any[] = [];
  for (let off = 0; off < max; off += 1000) { const { data, error } = await q(off, off + 999); if (error) return { rows: out, ok: false }; out.push(...(data ?? [])); if (!data || data.length < 1000) break; }
  return { rows: out, ok: true };
}
export interface Loaded { raw: RawAcq; missing: string[] }
/** Loads everything the report needs (counts and ids only; no names, answers or notes). A table that is not installed yet is reported in `missing`, never faked. */
export async function loadRaw(service: SupabaseClient, now: Date = new Date()): Promise<Loaded> {
  const missing: string[] = [];
  const get = async (name: string, cols: string, opt: { order?: string; max?: number } = {}) => { const r = await pageAll((a, b) => { let q = service.from(name).select(cols); if (opt.order) q = q.order(opt.order, { ascending: true }); return q.range(a, b); }, opt.max); if (!r.ok) missing.push(name); return r.rows; };
  const since = new Date(now.getTime() - 400 * 86400000).toISOString();
  const viewsQ = async () => { let r = await pageAll((a, b) => service.from('page_views').select('at, visitor, path, channel, source, campaign, content, device, browser, os, country, signed_in').gte('at', since).order('at', { ascending: true }).range(a, b), 200000);
    if (!r.ok && !r.rows.length) { r = await pageAll((a, b) => service.from('page_views').select('at, visitor, path, channel, source, campaign, device, browser, os, country, signed_in').gte('at', since).order('at', { ascending: true }).range(a, b), 200000); if (!r.ok) missing.push('page_views'); } return r.rows; };
  const [users, attrs, students, profiles, goals, subjects, attempts, baselines, sessions, payments, access, revenue, saleLinks, refEvents, refCodes, oldReferrals, links, partners, crm, campaigns, content, metrics, touches, expenses, experiments] = await Promise.all([
    get('users', 'id, role, created_at, source, utm, country, contact_email'), get('acquisition_attribution', '*'), get('students', 'id, user_id, grade, created_at'), get('student_profile_details', 'student_id, school_board, school_state'),
    get('learning_goals', 'student_id, subject_id'), get('subjects', 'id, name'), get('diagnostic_attempts', 'student_id, status, started_at, completed_at'), get('student_baselines', 'student_id, created_at'), get('learning_sessions', 'student_id, started_at'),
    get('pilot_payments', 'id, student_id, amount, status, confirmed_at, created_at, pilot_start_date, pilot_end_date'), get('student_access', 'student_id, plan_code, access_until'), get('revenue_entries', 'id, received_on, customer_kind, amount_inr'),
    get('acq_sale_links', '*'), get('referral_events', 'id, code, referrer_user, referred_user, referred_role, status, created_at, qualified_at'), get('user_referral_codes', 'user_id, code'), get('referrals', 'referrer_student, referred_student, reward_status, created_at'),
    get('student_links', 'student_id, adult_user_id, link_type, status'), get('acq_partners', '*'), get('crm_records', 'id, kind, stage, status, source, user_id'), get('social_campaigns', '*'), get('social_content', 'id, slug, campaign_id, platform, audience, pillar, cta, status, published_at, archived'),
    get('social_metrics', 'content_id, platform, metric_date, impressions, reach, likes, comments, shares, saves, clicks, leads, registrations, conversions, revenue_inr'), get('acquisition_touches', 'anon, at, source, campaign, content, partner_code, user_id', { max: 100000 }),
    get('expenses', 'spent_on, category, amount_inr, acq_campaign, acq_source'), get('acq_experiments', '*'),
  ]);
  const views = await viewsQ();
  const usageR = await pageAll((a, b) => service.from('ai_usage').select('student_id, tier, provider, feature, ok, input_tokens, output_tokens, created_at').order('created_at', { ascending: true }).range(a, b), 100000);
  let settings = await loadAcqSettings(service); let base = ''; let rewardsOn = false, daysReferrer = 0, held = 0;
  try { base = siteBase(await loadSocialSettings(service)); } catch { /* optional */ }
  try { const rs = await loadReferralSettings(service); rewardsOn = rs.rewards_on; daysReferrer = rs.days_referrer; } catch { /* optional */ }
  try { const { data } = await service.from('bonus_days_ledger').select('days').is('applied_at', null).limit(5000); held = ((data ?? []) as any[]).reduce((a, r) => a + (r.days || 0), 0); } catch { /* optional */ }
  return { missing, raw: { now, settings, siteBase: base, rewardsOn, daysReferrer, bonusDaysHeld: held, users, attrs, students, profiles, goals, subjects, attempts, baselines, sessions, payments, access, revenue, saleLinks, refEvents, refCodes, oldReferrals, links, partners, crm, campaigns, content, metrics, touches, views, expenses, usage: usageR.rows as UsageRow[], experiments } };
}

// ---------- partners ----------
const slug = (s: string) => s.toUpperCase().normalize('NFKD').replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'X';
export async function createPartner(service: SupabaseClient, p: { kind: string; name: string; userId?: string | null; notes?: string; status?: string }): Promise<string> {
  const kind = (PARTNER_KINDS as readonly string[]).includes(p.kind) ? p.kind : 'other'; const name = clean(p.name, 80); if (!name || name.length < 2) throw new Error('Give the partner a name.');
  const prefix = PARTNER_PREFIX[kind] ?? 'PARTNER'; const stem = `${prefix}-${slug(name.split(/\s+/)[0])}`;
  const { data: ex } = await service.from('acq_partners').select('code').like('code', `${stem}-%`); const taken = new Set(((ex ?? []) as any[]).map((r) => r.code));
  for (let n = 1; n < 1000; n++) {
    const code = `${stem}-${String(n).padStart(3, '0')}`; if (taken.has(code)) continue;
    const { error } = await service.from('acq_partners').insert({ code, kind, name, user_id: p.userId ?? null, notes: clean(p.notes, 500), status: (PARTNER_STATUS as readonly string[]).includes(String(p.status)) ? p.status : 'lead' });
    if (!error) return code; if (!/duplicate|unique|23505/i.test(String(error.message))) throw friendly('save the partner', error);
  }
  throw new Error('Could not make a partner code.');
}
export async function updatePartner(service: SupabaseClient, code: string, p: { status?: string; rewardStatus?: string; rewardNote?: string; notes?: string }): Promise<void> {
  const row: any = {};
  if (p.status !== undefined) { if (!(PARTNER_STATUS as readonly string[]).includes(p.status)) throw new Error('Unknown status.'); row.status = p.status; }
  if (p.rewardStatus !== undefined) { if (!(PARTNER_REWARD_STATUS as readonly string[]).includes(p.rewardStatus)) throw new Error('Unknown reward status.'); row.reward_status = p.rewardStatus; }
  if (p.rewardNote !== undefined) row.reward_note = clean(p.rewardNote, 300); if (p.notes !== undefined) row.notes = clean(p.notes, 500);
  if (!Object.keys(row).length) return; const { error } = await service.from('acq_partners').update(row).eq('code', code); if (error) throw friendly('update the partner', error);
}

// ---------- offline sales (same payment tables as the rest of the app) ----------
export interface SaleInput { who: 'student' | 'organisation'; username?: string; customerKind?: string; customerName?: string; offer?: string; amount: number; paymentDate: string; reference?: string; status?: string; activation?: string; expiry?: string; notes?: string; method?: string; source?: string; campaign?: string; partner?: string; referralCode?: string }
export async function recordOfflineSale(service: SupabaseClient, s: SaleInput, actor: string): Promise<{ id: string; note: string }> {
  const amount = Number(s.amount); if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) throw new Error('Enter the amount in rupees.');
  const date = ymd(s.paymentDate); if (!date) throw new Error('Enter the payment date.');
  const source = s.source ? cleanSource(s.source) : null; const partner = clean(s.partner, 40)?.toUpperCase() ?? null; const refc = clean(s.referralCode, 20)?.toUpperCase() ?? null;
  if (partner) { const { data } = await service.from('acq_partners').select('code').eq('code', partner).maybeSingle(); if (!data) throw new Error('That partner code does not exist. Create the partner first.'); }
  if (s.who === 'student') {
    const uname = clean(s.username, 60); if (!uname) throw new Error('Enter the student username.');
    const { data: u } = await service.from('users').select('id').eq('username', uname).maybeSingle(); if (!u) throw new Error('No account with that username.');
    const { data: st } = await service.from('students').select('id').eq('user_id', u.id).maybeSingle(); if (!st) throw new Error('That account is not a student.');
    const status = ['pending', 'confirmed', 'rejected'].includes(String(s.status)) ? String(s.status) : 'pending';
    const { data: pay, error } = await service.from('pilot_payments').insert({ student_id: st.id, offer_label: clean(s.offer, 80) ?? 'Offline payment', amount, payment_date: date, transaction_reference: clean(s.reference, 60), status, pilot_start_date: ymd(s.activation), pilot_end_date: ymd(s.expiry), admin_notes: clean(s.notes, 300), confirmed_at: status === 'confirmed' ? new Date().toISOString() : null }).select('id').single();
    if (error || !pay) throw friendly('save the payment', error);
    const { error: e2 } = await service.from('acq_sale_links').insert({ pilot_payment_id: pay.id, user_id: u.id, payment_source: source, campaign: clean(s.campaign, 60), partner_code: partner, referral_code: refc, note: clean(s.notes, 300), created_by: actor });
    if (e2) throw friendly('link the payment to its source', e2);
    return { id: pay.id, note: status === 'confirmed' ? 'Saved as confirmed. Remember: access is switched on at /admin/payments (Verify payment and activate); saving a sale here does not grant access.' : 'Saved. Confirm it and switch on access at /admin/payments.' };
  }
  const kind = ['parent', 'student', 'tutor', 'centre', 'school', 'govt_school', 'govt_institution', 'partner', 'other'].includes(String(s.customerKind)) ? String(s.customerKind) : 'other';
  const method = ['upi', 'qr', 'bank_transfer', 'cash', 'other'].includes(String(s.method)) ? String(s.method) : 'upi';
  const { data: rev, error } = await service.from('revenue_entries').insert({ received_on: date, customer_kind: kind, customer_name: clean(s.customerName, 80), product: clean(s.offer, 80), amount_inr: Math.round(amount), method, reference: clean(s.reference, 60), verified_by: actor, notes: clean(s.notes, 300) }).select('id').single();
  if (error || !rev) throw friendly('save the sale', error);
  const { error: e2 } = await service.from('acq_sale_links').insert({ revenue_entry_id: rev.id, payment_source: source, campaign: clean(s.campaign, 60), partner_code: partner, referral_code: refc, note: clean(s.notes, 300), created_by: actor });
  if (e2) throw friendly('link the sale to its source', e2);
  return { id: rev.id, note: 'Saved. It counts in the acquisition dashboard under the source you chose.' };
}
/** Tag a payment or sale that already exists (for example one typed in before v76). */
export async function tagSale(service: SupabaseClient, t: { pilotPaymentId?: string; revenueEntryId?: string; source?: string; campaign?: string; partner?: string; referralCode?: string }, actor: string): Promise<void> {
  if (!t.pilotPaymentId && !t.revenueEntryId) throw new Error('Choose a payment.');
  let userId: string | null = null;
  if (t.pilotPaymentId) { const { data: p } = await service.from('pilot_payments').select('student_id').eq('id', t.pilotPaymentId).maybeSingle(); if (!p) throw new Error('Payment not found.'); const { data: st } = await service.from('students').select('user_id').eq('id', p.student_id).maybeSingle(); userId = st?.user_id ?? null; }
  const partner = clean(t.partner, 40)?.toUpperCase() ?? null; if (partner) { const { data } = await service.from('acq_partners').select('code').eq('code', partner).maybeSingle(); if (!data) throw new Error('That partner code does not exist.'); }
  const row: any = { pilot_payment_id: t.pilotPaymentId ?? null, revenue_entry_id: t.revenueEntryId ?? null, user_id: userId, payment_source: t.source ? cleanSource(t.source) : null, campaign: clean(t.campaign, 60), partner_code: partner, referral_code: clean(t.referralCode, 20)?.toUpperCase() ?? null, created_by: actor };
  const col = t.pilotPaymentId ? 'pilot_payment_id' : 'revenue_entry_id'; const { data: ex } = await service.from('acq_sale_links').select('id').eq(col, row[col]).maybeSingle();
  const { error } = ex ? await service.from('acq_sale_links').update(row).eq('id', ex.id) : await service.from('acq_sale_links').insert(row);
  if (error) throw friendly('save the tag', error);
}
export async function untaggedSales(service: SupabaseClient, limit = 30): Promise<{ kind: 'payment' | 'entry'; id: string; date: string; amount: number; what: string }[]> {
  const [{ data: p }, { data: e }, { data: l }] = await Promise.all([service.from('pilot_payments').select('id, amount, created_at, status').order('created_at', { ascending: false }).limit(300), service.from('revenue_entries').select('id, amount_inr, received_on, customer_kind').order('received_on', { ascending: false }).limit(300), service.from('acq_sale_links').select('pilot_payment_id, revenue_entry_id')]);
  const tp = new Set(((l ?? []) as any[]).map((x) => x.pilot_payment_id).filter(Boolean)), te = new Set(((l ?? []) as any[]).map((x) => x.revenue_entry_id).filter(Boolean));
  return [...((p ?? []) as any[]).filter((x) => !tp.has(x.id)).map((x) => ({ kind: 'payment' as const, id: x.id, date: String(x.created_at).slice(0, 10), amount: Number(x.amount) || 0, what: `Student payment (${x.status})` })), ...((e ?? []) as any[]).filter((x) => !te.has(x.id)).map((x) => ({ kind: 'entry' as const, id: x.id, date: x.received_on, amount: Number(x.amount_inr) || 0, what: `Received: ${x.customer_kind}` }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ---------- campaign extras, spend tags, experiments ----------
export async function saveCampaignWithExtras(service: SupabaseClient, actor: string, c: any): Promise<string> {
  const id = await saveCampaign(service, actor, c); const row: any = {};
  if (c.owner !== undefined) row.owner = clean(c.owner, 60); if (c.platforms !== undefined) row.platforms = clean(c.platforms, 120);
  if (Object.keys(row).length) await service.from('social_campaigns').update(row).eq('id', id); return id;
}
export async function tagExpense(service: SupabaseClient, e: { amount: number; date: string; description?: string; source?: string; campaign?: string; category?: string }, actor: string): Promise<void> {
  const amount = Math.round(Number(e.amount)); if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter the amount in rupees.'); const date = ymd(e.date); if (!date) throw new Error('Enter the date.');
  if (!e.source && !e.campaign) throw new Error('Tag the spend to a source or a campaign, otherwise it cannot be used for cost per customer.');
  const category = ['marketing', 'referral'].includes(String(e.category)) ? String(e.category) : 'marketing';
  const { error } = await service.from('expenses').insert({ spent_on: date, category, description: clean(e.description, 120), amount_inr: amount, created_by: actor, acq_source: e.source ? cleanSource(e.source) : null, acq_campaign: clean(e.campaign, 60) });
  if (error) throw friendly('save the spend', error);
}
export async function saveExperiment(service: SupabaseClient, x: any): Promise<string> {
  const name = clean(x.name, 80); if (!name || name.length < 3) throw new Error('Give the experiment a name.');
  const metric = (EXPERIMENT_METRICS as readonly string[]).includes(x.metric) ? x.metric : 'signup_rate';
  const row: any = { name, hypothesis: clean(x.hypothesis, 300), channel: clean(x.channel, 40), audience: clean(x.audience, 60), variant_a: clean(x.variantA, 60), variant_b: clean(x.variantB, 60), start_date: ymd(x.startDate), end_date: ymd(x.endDate), metric, status: ['planned', 'running', 'finished', 'stopped'].includes(x.status) ? x.status : 'running', note: clean(x.note, 300) };
  if (row.start_date && row.end_date && row.end_date < row.start_date) throw new Error('The end date is before the start date.');
  if (x.id) { const { error } = await service.from('acq_experiments').update(row).eq('id', x.id); if (error) throw friendly('save the experiment', error); return x.id; }
  const { data, error } = await service.from('acq_experiments').insert(row).select('id').single(); if (error || !data) throw friendly('save the experiment', error); return data.id;
}

/** Save the first-touch source of accounts made before v76 (from users.source / users.utm) so it is a stored fact. Never overwrites an existing row. */
export async function backfillAttribution(service: SupabaseClient): Promise<number> {
  const { rows: users } = await pageAll((a, b) => service.from('users').select('id, role, created_at, source, utm').range(a, b));
  const { rows: have } = await pageAll((a, b) => service.from('acquisition_attribution').select('user_id').range(a, b));
  const done = new Set(have.map((r) => r.user_id)); let n = 0;
  for (const u of users) {
    if (u.role === 'admin' || done.has(u.id) || !u.source) continue;
    const c = u.utm && typeof u.utm === 'object' ? clean(u.utm.campaign, 60) : null; const m = u.utm && typeof u.utm === 'object' ? clean(u.utm.medium, 40) : null; const s = cleanSource(u.source);
    const { error } = await service.from('acquisition_attribution').insert({ user_id: u.id, customer_type: customerTypeOfRole(u.role), first_source: s, first_medium: m, first_campaign: c, first_at: u.created_at, last_source: s, last_medium: m, last_campaign: c, last_at: u.created_at, backfilled: true });
    if (!error) n++;
  }
  return n;
}
