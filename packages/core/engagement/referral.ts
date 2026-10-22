import type { SupabaseClient } from '@supabase/supabase-js';
import { featureOn, type EngagementSettings } from './config';
import { cleanCode, newCode } from './friend';

// Referral loop. A student shares an invite code; a new student can enter it once, in their first 14 days. Counts only.
// There is NO automatic reward and nothing here touches payments, XP, scores or mastery. The founder decides any reward by hand (reward_status).
export const REFERRAL_WINDOW_DAYS = 14, MAX_REFERRALS_PER_CODE = 50;
const err = (m: string) => new Error(m);

export async function getOrCreateReferralCode(service: SupabaseClient, studentId: string): Promise<string> {
  const { data: ex } = await service.from('referral_codes').select('code').eq('student_id', studentId).maybeSingle();
  if (ex?.code) return ex.code;
  for (let i = 0; i < 6; i++) { const code = newCode(); const { error } = await service.from('referral_codes').insert({ student_id: studentId, code }); if (!error) return code; const { data: again } = await service.from('referral_codes').select('code').eq('student_id', studentId).maybeSingle(); if (again?.code) return again.code; }
  throw err('Could not make your code. Try again.');
}

export async function redeemReferralCode(service: SupabaseClient, studentId: string, raw: string, settings: EngagementSettings, nowMs = Date.now()): Promise<void> {
  if (!featureOn(settings, studentId, 'referral')) throw err('Invites are not switched on yet.');
  const code = cleanCode(raw); if (code.length !== 8) throw err('That code does not look right. It has 8 letters and numbers.');
  const { data: owner } = await service.from('referral_codes').select('student_id').eq('code', code).maybeSingle();
  if (!owner) throw err('That code was not found.');
  if (owner.student_id === studentId) throw err('You cannot use your own code.');
  const { data: me } = await service.from('students').select('created_at').eq('id', studentId).maybeSingle();
  if (me?.created_at && nowMs - new Date(me.created_at).getTime() > REFERRAL_WINDOW_DAYS * 86400000) throw err(`Invite codes can be used in the first ${REFERRAL_WINDOW_DAYS} days after signing up.`);
  const { data: already } = await service.from('referrals').select('id').eq('referred_student', studentId).maybeSingle();
  if (already) throw err('You have already used an invite code.');
  const { count } = await service.from('referrals').select('id', { count: 'exact', head: true }).eq('code', code);
  if ((count ?? 0) >= MAX_REFERRALS_PER_CODE) throw err('This code has reached its limit.');
  const { error } = await service.from('referrals').insert({ code, referrer_student: owner.student_id, referred_student: studentId });
  if (error) throw err('You have already used an invite code.');
}

export async function referralStats(service: SupabaseClient, studentId: string): Promise<{ signedUp: number; firstDiagnostic: number; usedACode: boolean }> {
  const { data } = await service.from('referrals').select('referred_student').eq('referrer_student', studentId).limit(MAX_REFERRALS_PER_CODE);
  const ids = ((data ?? []) as any[]).map((r) => r.referred_student);
  let diag = 0;
  if (ids.length) { const { data: d } = await service.from('diagnostic_attempts').select('student_id').in('student_id', ids).eq('status', 'completed').limit(5000); diag = new Set(((d ?? []) as any[]).map((r) => r.student_id)).size; }
  const { data: mine } = await service.from('referrals').select('id').eq('referred_student', studentId).maybeSingle();
  return { signedUp: ids.length, firstDiagnostic: diag, usedACode: !!mine };
}

/** Admin: who referred how many, with counts only. Reward status is set by hand. */
export interface ReferralAdminRow { referrerId: string; code: string; signedUp: number; firstDiagnostic: number; rows: { id: string; rewardStatus: string; rewardNote: string | null; createdAt: string }[] }
export async function listReferralsAdmin(service: SupabaseClient): Promise<ReferralAdminRow[]> {
  const { data } = await service.from('referrals').select('id, code, referrer_student, referred_student, reward_status, reward_note, created_at').order('created_at', { ascending: false }).limit(2000);
  const rows = (data ?? []) as any[]; if (!rows.length) return [];
  const referred = [...new Set(rows.map((r) => r.referred_student))];
  const { data: d } = await service.from('diagnostic_attempts').select('student_id').in('student_id', referred).eq('status', 'completed').limit(20000);
  const done = new Set(((d ?? []) as any[]).map((r) => r.student_id));
  const by = new Map<string, ReferralAdminRow>();
  for (const r of rows) {
    const e: ReferralAdminRow = by.get(r.referrer_student) ?? { referrerId: r.referrer_student, code: r.code, signedUp: 0, firstDiagnostic: 0, rows: [] };
    e.signedUp++; if (done.has(r.referred_student)) e.firstDiagnostic++; e.rows.push({ id: r.id, rewardStatus: r.reward_status, rewardNote: r.reward_note, createdAt: r.created_at }); by.set(r.referrer_student, e);
  }
  return [...by.values()].sort((a, b) => b.signedUp - a.signedUp);
}
export async function setReferralReward(service: SupabaseClient, id: string, status: string, note: string): Promise<void> {
  if (!['none', 'under_review', 'approved', 'declined'].includes(status)) throw err('Unknown status.');
  const { error } = await service.from('referrals').update({ reward_status: status, reward_note: note.trim().slice(0, 300) || null, reviewed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw err('Could not save.');
}
