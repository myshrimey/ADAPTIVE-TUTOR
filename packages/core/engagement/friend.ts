import type { SupabaseClient } from '@supabase/supabase-js';
import { featureOn, type EngagementSettings } from './config';
import { loadPool, type EngineCtx } from './challenge';
import { shuffle, MODE_SIZE } from './challenge-policy';

// Friend challenge: one friend, one code, the same 5 verified questions. Each player sees the other's NICKNAME and score only after both have played.
// No chat, no names, no contact details. OFF until the founder switches the feature on.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_OPEN_CREATED = 3, MAX_OPEN_JOINED = 5, FRIEND_DAYS = 7;
export const cleanCode = (c: unknown) => String(c ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
export function newCode(rng: () => number = Math.random): string { let s = ''; for (let i = 0; i < 8; i++) s += ALPHABET[Math.floor(rng() * ALPHABET.length)]; return s; }
const err = (m: string) => new Error(m);

async function nicknameOf(service: SupabaseClient, studentId: string): Promise<string | null> {
  const { data } = await service.from('student_engagement').select('nickname').eq('student_id', studentId).maybeSingle();
  return data?.nickname ?? null;
}
const live = (r: any, now: number) => ['open', 'joined'].includes(r.status) && new Date(r.expires_at).getTime() > now;

export async function createFriendChallenge(service: SupabaseClient, studentId: string, subjectId: string, ctx: EngineCtx): Promise<{ id: string; code: string }> {
  if (!featureOn(ctx.settings, studentId, 'friend_challenge')) throw err('Friend challenges are not switched on yet.');
  if (!(await nicknameOf(service, studentId))) throw err('Choose a nickname on the progress page first.');
  const now = Date.now();
  const { data: mine } = await service.from('friend_challenges').select('id, status, expires_at').eq('created_by_student', studentId).in('status', ['open', 'joined']).limit(50);
  if (((mine ?? []) as any[]).filter((r) => live(r, now)).length >= MAX_OPEN_CREATED) throw err('You already have 3 open friend challenges. Finish or cancel one first.');
  const pool = await loadPool(service, ctx, { subjectId, verifiedOnly: true });
  if (pool.length < MODE_SIZE.friend) throw err('There are not enough verified questions in this subject for a friend challenge yet.');
  const picked = shuffle(pool).slice(0, MODE_SIZE.friend).sort((a, b) => a.difficulty - b.difficulty);
  const plan = picked.map((q) => ({ qid: q.id, table: 'diagnostic_questions', role: 'normal', difficulty: q.difficulty, skillId: q.skill_id }));
  for (let i = 0; i < 6; i++) {
    const code = newCode();
    const { data, error } = await service.from('friend_challenges').insert({ created_by_student: studentId, invite_code: code, plan, subject_id: subjectId, status: 'open', expires_at: new Date(now + FRIEND_DAYS * 86400000).toISOString() }).select('id').single();
    if (!error && data) return { id: data.id, code };
  }
  throw err('Could not create the challenge. Try again.');
}

export async function joinFriendChallenge(service: SupabaseClient, studentId: string, rawCode: string, settings: EngagementSettings): Promise<{ id: string }> {
  if (!featureOn(settings, studentId, 'friend_challenge')) throw err('Friend challenges are not switched on yet.');
  const code = cleanCode(rawCode); if (code.length !== 8) throw err('That code does not look right. It has 8 letters and numbers.');
  if (!(await nicknameOf(service, studentId))) throw err('Choose a nickname on the progress page first.');
  const now = Date.now();
  const { data: fc } = await service.from('friend_challenges').select('*').eq('invite_code', code).maybeSingle();
  if (!fc || fc.status !== 'open' || new Date(fc.expires_at).getTime() <= now) throw err('This code is not valid any more.');
  if (fc.created_by_student === studentId) throw err('You made this challenge. Share the code with a friend.');
  const { data: joined } = await service.from('friend_challenges').select('id, status, expires_at').eq('joined_by_student', studentId).in('status', ['joined']).limit(50);
  if (((joined ?? []) as any[]).filter((r) => live(r, now)).length >= MAX_OPEN_JOINED) throw err('You have 5 friend challenges to finish already.');
  const { data: upd } = await service.from('friend_challenges').update({ status: 'joined', joined_by_student: studentId }).eq('id', fc.id).eq('status', 'open').select('id').maybeSingle();
  if (!upd) throw err('This code is not valid any more.');
  return { id: fc.id };
}

export async function cancelFriendChallenge(service: SupabaseClient, studentId: string, id: string): Promise<void> {
  await service.from('friend_challenges').update({ status: 'cancelled' }).eq('id', id).eq('created_by_student', studentId).eq('status', 'open');
}

export interface FriendView {
  id: string; role: 'creator' | 'joiner'; status: 'waiting' | 'play' | 'waiting_friend' | 'done' | 'expired' | 'cancelled';
  code: string | null; subjectName: string | null; friendNickname: string | null;
  mine: { correct: number; total: number } | null; theirs: { correct: number; total: number } | null; expiresAt: string;
}
export async function listFriendChallenges(service: SupabaseClient, studentId: string, subjectName: (id: string | null) => string | null, nowMs = Date.now()): Promise<FriendView[]> {
  const { data: a } = await service.from('friend_challenges').select('*').eq('created_by_student', studentId).order('created_at', { ascending: false }).limit(20);
  const { data: b } = await service.from('friend_challenges').select('*').eq('joined_by_student', studentId).order('created_at', { ascending: false }).limit(20);
  const rows = [...((a ?? []) as any[]), ...((b ?? []) as any[])].sort((x, y) => (x.created_at < y.created_at ? 1 : -1)).slice(0, 20);
  const attIds = rows.flatMap((r) => [r.creator_attempt_id, r.joiner_attempt_id]).filter(Boolean);
  const { data: atts } = attIds.length ? await service.from('challenge_attempts').select('id, correct, total').in('id', attIds) : { data: [] };
  const att = new Map(((atts ?? []) as any[]).map((x) => [x.id, { correct: x.correct, total: x.total }]));
  const out: FriendView[] = [];
  for (const r of rows) {
    const role = r.created_by_student === studentId ? 'creator' : 'joiner';
    const myA = role === 'creator' ? r.creator_attempt_id : r.joiner_attempt_id, theirA = role === 'creator' ? r.joiner_attempt_id : r.creator_attempt_id;
    const both = !!myA && !!theirA;
    const friendId = role === 'creator' ? r.joined_by_student : r.created_by_student;
    let status: FriendView['status'];
    if (r.status === 'cancelled') status = 'cancelled';
    else if (both) status = 'done';
    else if (new Date(r.expires_at).getTime() <= nowMs) status = 'expired';
    else if (r.status === 'open') status = myA ? 'waiting' : 'play';
    else status = myA ? 'waiting_friend' : 'play';
    out.push({
      id: r.id, role, status, code: role === 'creator' && r.status === 'open' ? r.invite_code : null, subjectName: subjectName(r.subject_id ?? null),
      friendNickname: friendId && both ? await nicknameOf(service, friendId) : null,
      mine: myA && att.get(myA) ? att.get(myA)! : null, theirs: both && att.get(theirA) ? att.get(theirA)! : null, expiresAt: r.expires_at,
    });
  }
  return out;
}
