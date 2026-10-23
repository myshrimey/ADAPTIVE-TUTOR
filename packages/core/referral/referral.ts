import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanCode, newCode } from '../engagement/friend';

// Referral links for every role (v60). A person shares their own link; the friend signs up through it; when the friend finishes their first
// diagnostic (a real one: enough answers) both sides get bonus access days, automatically and only once. Teachers, tutors and centres are not
// paid in days: their rewards are held for the founder to decide by hand. The founder sets the number of days and switches rewards on.
export interface ReferralSettings { links_on: boolean; rewards_on: boolean; days_referrer: number; days_referred: number; max_rewarded_per_referrer: number; max_per_ip: number; min_answers: number }
export const DEFAULT_REFERRAL: ReferralSettings = { links_on: true, rewards_on: false, days_referrer: 7, days_referred: 7, max_rewarded_per_referrer: 10, max_per_ip: 3, min_answers: 10 };
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
export function cleanReferralSettings(raw: any): ReferralSettings {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    links_on: r.links_on !== false, rewards_on: r.rewards_on === true,
    days_referrer: num(r.days_referrer, 0, 90, DEFAULT_REFERRAL.days_referrer), days_referred: num(r.days_referred, 0, 90, DEFAULT_REFERRAL.days_referred),
    max_rewarded_per_referrer: num(r.max_rewarded_per_referrer, 0, 100, DEFAULT_REFERRAL.max_rewarded_per_referrer), max_per_ip: num(r.max_per_ip, 1, 50, DEFAULT_REFERRAL.max_per_ip), min_answers: num(r.min_answers, 1, 50, DEFAULT_REFERRAL.min_answers),
  };
}
export async function loadReferralSettings(service: SupabaseClient): Promise<ReferralSettings> {
  try { const { data } = await service.from('commerce_settings').select('value').eq('key', 'referral').maybeSingle(); return cleanReferralSettings(data?.value); } catch { return DEFAULT_REFERRAL; }
}
export async function saveReferralSettings(service: SupabaseClient, raw: unknown): Promise<ReferralSettings> {
  const s = cleanReferralSettings(raw);
  const { error } = await service.from('commerce_settings').upsert({ key: 'referral', value: s, note: 'v60 referral rewards', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error('Could not save.');
  return s;
}

export const REFERRER_ROLES = ['student', 'parent', 'teacher', 'tutor', 'centre'] as const;
/** Roles whose reward is access days. The others are held for the founder. */
export const DAY_REWARD_ROLES = ['student', 'parent'];
export const MAX_LINKED_CHILDREN_REWARDED = 3;

export const addDays = (ymd: string, days: number): string => new Date(Date.parse(ymd + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
export const todayYmd = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export const referralLink = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/r/${code}`;

export async function getOrCreateUserCode(service: SupabaseClient, userId: string): Promise<string> {
  const { data: ex } = await service.from('user_referral_codes').select('code').eq('user_id', userId).maybeSingle();
  if (ex?.code) return ex.code;
  for (let i = 0; i < 6; i++) {
    const code = newCode(); const { error } = await service.from('user_referral_codes').insert({ user_id: userId, code });
    if (!error) return code;
    const { data: again } = await service.from('user_referral_codes').select('code').eq('user_id', userId).maybeSingle(); if (again?.code) return again.code;
  }
  throw new Error('Could not make your link. Try again.');
}

export type AttachResult = 'attached' | 'blocked_ip' | 'links_off' | 'bad_code' | 'unknown_code' | 'self' | 'already' | 'error';
/** Called by the sign-up routes right after the new account exists. Never throws: a referral problem must never stop a sign-up. */
export async function attachReferral(service: SupabaseClient, p: { code: unknown; referredUserId: string; referredRole: string; ipHash?: string | null }): Promise<AttachResult> {
  try {
    const code = cleanCode(p.code); if (code.length !== 8) return 'bad_code';
    const settings = await loadReferralSettings(service); if (!settings.links_on) return 'links_off';
    const { data: owner } = await service.from('user_referral_codes').select('user_id').eq('code', code).maybeSingle();
    if (!owner) return 'unknown_code';
    if (owner.user_id === p.referredUserId) return 'self';
    let status: 'signed_up' | 'blocked' = 'signed_up'; let note: string | null = null;
    if (p.ipHash) {
      const { count } = await service.from('referral_events').select('id', { count: 'exact', head: true }).eq('referrer_user', owner.user_id).eq('ip_hash', p.ipHash);
      if ((count ?? 0) >= settings.max_per_ip) { status = 'blocked'; note = 'Too many sign-ups from the same internet address for this referrer; no reward.'; }
    }
    const { error } = await service.from('referral_events').insert({ code, referrer_user: owner.user_id, referred_user: p.referredUserId, referred_role: p.referredRole, ip_hash: p.ipHash ?? null, status, note });
    if (error) return 'already';
    return status === 'blocked' ? 'blocked_ip' : 'attached';
  } catch { return 'error'; }
}

/** Adds bonus days. Idempotent through `ref`. Added to the end date straight away when the student has a paid plan that has not ended; otherwise held and added when a paid plan is activated. */
export async function grantBonusDays(service: SupabaseClient, studentId: string, days: number, reason: string, ref: string, now = Date.now()): Promise<'applied' | 'held' | 'duplicate' | 'none'> {
  if (!(days > 0)) return 'none';
  const { error } = await service.from('bonus_days_ledger').insert({ student_id: studentId, days: Math.min(365, Math.round(days)), reason, ref });
  if (error) return 'duplicate';
  const applied = await applyHeldBonusDays(service, studentId, now);
  return applied > 0 ? 'applied' : 'held';
}
/** Moves held days onto a paid, unexpired plan. Returns the number of days added. */
export async function applyHeldBonusDays(service: SupabaseClient, studentId: string, now = Date.now()): Promise<number> {
  const { data: acc } = await service.from('student_access').select('plan_code, access_until').eq('student_id', studentId).maybeSingle();
  const today = todayYmd(now);
  if (!acc || acc.plan_code === 'free' || !acc.access_until || acc.access_until < today) return 0;
  const { data: rows } = await service.from('bonus_days_ledger').select('id, days').eq('student_id', studentId).is('applied_at', null).limit(200);
  const held = (rows ?? []) as { id: string; days: number }[]; if (!held.length) return 0;
  const total = held.reduce((a, r) => a + r.days, 0);
  const { error } = await service.from('student_access').update({ access_until: addDays(acc.access_until, total), updated_at: new Date(now).toISOString() }).eq('student_id', studentId);
  if (error) return 0;
  await service.from('bonus_days_ledger').update({ applied_at: new Date(now).toISOString() }).in('id', held.map((r) => r.id));
  return total;
}
export async function heldBonusDays(service: SupabaseClient, studentId: string): Promise<number> {
  const { data } = await service.from('bonus_days_ledger').select('days').eq('student_id', studentId).is('applied_at', null).limit(200);
  return ((data ?? []) as any[]).reduce((a, r) => a + r.days, 0);
}

async function studentIdOfUser(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await service.from('students').select('id').eq('user_id', userId).maybeSingle(); return data?.id ?? null;
}
async function roleOfUser(service: SupabaseClient, userId: string): Promise<string> {
  const { data } = await service.from('users').select('role').eq('id', userId).maybeSingle(); return data?.role ?? 'student';
}

/** Gives out the rewards for one qualified event (idempotent). Returns what was done. */
export async function rewardEvent(service: SupabaseClient, eventId: string, settings?: ReferralSettings, now = Date.now()): Promise<{ status: string; referrerDays: number; referredDays: number }> {
  const s = settings ?? (await loadReferralSettings(service));
  const { data: ev } = await service.from('referral_events').select('*').eq('id', eventId).maybeSingle();
  if (!ev || !['qualified', 'held'].includes(ev.status)) return { status: ev?.status ?? 'missing', referrerDays: 0, referredDays: 0 };
  if (!s.rewards_on) return { status: ev.status, referrerDays: 0, referredDays: 0 };
  const referrerRole = await roleOfUser(service, ev.referrer_user);
  if (!DAY_REWARD_ROLES.includes(referrerRole)) {
    await service.from('referral_events').update({ status: 'held', note: 'Referrer is a teacher, tutor or centre: the reward is decided by the founder.' }).eq('id', eventId);
    // the invited family still gets its days
    const rid = await studentIdOfUser(service, ev.referred_user);
    let referredDays = 0; if (rid && s.days_referred > 0) { const r = await grantBonusDays(service, rid, s.days_referred, 'Joined through an invite link', `ref:${eventId}:referred`, now); if (r !== 'duplicate') referredDays = s.days_referred; }
    return { status: 'held', referrerDays: 0, referredDays };
  }
  const { count: rewardedSoFar } = await service.from('referral_events').select('id', { count: 'exact', head: true }).eq('referrer_user', ev.referrer_user).eq('status', 'rewarded');
  const capped = (rewardedSoFar ?? 0) >= s.max_rewarded_per_referrer;
  let referrerDays = 0, referredDays = 0;
  const rid = await studentIdOfUser(service, ev.referred_user);
  if (rid && s.days_referred > 0) { const r = await grantBonusDays(service, rid, s.days_referred, 'Joined through an invite link', `ref:${eventId}:referred`, now); if (r !== 'duplicate') referredDays = s.days_referred; }
  if (!capped && s.days_referrer > 0) {
    let targets: string[] = [];
    if (referrerRole === 'student') { const sid = await studentIdOfUser(service, ev.referrer_user); if (sid) targets = [sid]; }
    else { const { data: links } = await service.from('student_links').select('student_id').eq('adult_user_id', ev.referrer_user).eq('status', 'active').limit(MAX_LINKED_CHILDREN_REWARDED); targets = ((links ?? []) as any[]).map((l) => l.student_id); }
    for (const sid of targets) { const r = await grantBonusDays(service, sid, s.days_referrer, 'A friend you invited finished their first diagnostic', `ref:${eventId}:referrer:${sid}`, now); if (r !== 'duplicate') referrerDays += s.days_referrer; }
  }
  await service.from('referral_events').update({ status: capped ? 'held' : 'rewarded', note: capped ? 'Referrer reached the reward limit; the friend still got their days.' : null }).eq('id', eventId);
  return { status: capped ? 'held' : 'rewarded', referrerDays, referredDays };
}

/** Call when a student finishes a diagnostic. Qualifies (and rewards, if switched on) the referral of that student, or of an adult linked to them. Never throws. */
export async function qualifyReferralsForStudent(service: SupabaseClient, studentId: string, answeredCount: number): Promise<void> {
  try {
    const s = await loadReferralSettings(service);
    if (answeredCount < s.min_answers) return;
    const { data: st } = await service.from('students').select('user_id').eq('id', studentId).maybeSingle(); if (!st) return;
    const { data: links } = await service.from('student_links').select('adult_user_id').eq('student_id', studentId).eq('status', 'active').limit(10);
    const ids = [st.user_id, ...((links ?? []) as any[]).map((l) => l.adult_user_id)];
    const { data: evs } = await service.from('referral_events').select('id, status').in('referred_user', ids).eq('status', 'signed_up');
    for (const e of (evs ?? []) as any[]) {
      await service.from('referral_events').update({ status: 'qualified', qualified_at: new Date().toISOString() }).eq('id', e.id).eq('status', 'signed_up');
      await rewardEvent(service, e.id, s);
    }
  } catch (e: any) { console.error('referral qualify failed', e?.message); }
}

export interface ReferralOverview { code: string; invited: number; qualified: number; rewarded: number; held: number; daysEarned: number; heldDays: number; rewardsOn: boolean; daysReferrer: number; daysReferred: number; linksOn: boolean }
export async function referralOverview(service: SupabaseClient, userId: string): Promise<ReferralOverview> {
  const s = await loadReferralSettings(service);
  const code = await getOrCreateUserCode(service, userId);
  const { data } = await service.from('referral_events').select('status').eq('referrer_user', userId).limit(2000);
  const st = ((data ?? []) as any[]).map((r) => r.status as string);
  const sid = await studentIdOfUser(service, userId);
  let daysEarned = 0, heldDays = 0;
  if (sid) {
    const { data: led } = await service.from('bonus_days_ledger').select('days, applied_at').eq('student_id', sid).limit(500);
    for (const r of (led ?? []) as any[]) { daysEarned += r.days; if (!r.applied_at) heldDays += r.days; }
  }
  return { code, invited: st.length, qualified: st.filter((x) => x !== 'signed_up' && x !== 'blocked').length, rewarded: st.filter((x) => x === 'rewarded').length, held: st.filter((x) => x === 'held').length, daysEarned, heldDays, rewardsOn: s.rewards_on, daysReferrer: s.days_referrer, daysReferred: s.days_referred, linksOn: s.links_on };
}

export interface ReferralAdminEvent { id: string; code: string; referrerRole: string; referredRole: string; status: string; note: string | null; createdAt: string; qualifiedAt: string | null }
export async function listReferralEvents(service: SupabaseClient): Promise<{ events: ReferralAdminEvent[]; byRole: Record<string, { invited: number; qualified: number; rewarded: number }> }> {
  const { data } = await service.from('referral_events').select('id, code, referrer_user, referred_role, status, note, created_at, qualified_at').order('created_at', { ascending: false }).limit(1000);
  const rows = (data ?? []) as any[];
  const ids = [...new Set(rows.map((r) => r.referrer_user))];
  const roles = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) { const { data: u } = await service.from('users').select('id, role').in('id', ids.slice(i, i + 100)); for (const x of (u ?? []) as any[]) roles.set(x.id, x.role); }
  const byRole: Record<string, { invited: number; qualified: number; rewarded: number }> = {};
  const events = rows.map((r) => {
    const role = roles.get(r.referrer_user) ?? 'student';
    const b = (byRole[role] ??= { invited: 0, qualified: 0, rewarded: 0 }); b.invited++; if (r.status !== 'signed_up' && r.status !== 'blocked') b.qualified++; if (r.status === 'rewarded') b.rewarded++;
    return { id: r.id, code: r.code, referrerRole: role, referredRole: r.referred_role, status: r.status, note: r.note, createdAt: r.created_at, qualifiedAt: r.qualified_at } as ReferralAdminEvent;
  });
  return { events, byRole };
}
/** Admin: after switching rewards on, give out the rewards of friends who already qualified. */
export async function rewardAllQualified(service: SupabaseClient): Promise<number> {
  const s = await loadReferralSettings(service); if (!s.rewards_on) return 0;
  const { data } = await service.from('referral_events').select('id').eq('status', 'qualified').limit(500);
  let n = 0; for (const e of (data ?? []) as any[]) { const r = await rewardEvent(service, e.id, s); if (r.status === 'rewarded' || r.status === 'held') n++; }
  return n;
}
/** Admin: mark a held (teacher/tutor/centre) reward as dealt with by hand. */
export async function resolveHeldReward(service: SupabaseClient, eventId: string, note: string): Promise<void> {
  const { error } = await service.from('referral_events').update({ status: 'rewarded', note: ('Decided by hand: ' + note).slice(0, 300) }).eq('id', eventId).eq('status', 'held');
  if (error) throw new Error('Could not save.');
}
