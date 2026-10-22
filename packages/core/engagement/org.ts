import type { SupabaseClient } from '@supabase/supabase-js';
import { dayOf } from './streak';
import type { SkillInfo } from './store';
import { MIN_N } from './metrics';

// Tutor / centre challenges. A tutor sees participation and averages of the students linked to them (counts only). A student sees only their own result and how many of the group finished.
export interface OrgChallengeInput { scope: string; title: string; subjectId?: string | null; size?: number; startsOn: string; endsOn: string }
export function cleanOrgChallenge(i: any): { ok: true; value: { scope: string; title: string; subject_id: string | null; size: number; starts_on: string; ends_on: string } } | { ok: false; error: string } {
  const title = String(i?.title ?? '').trim().replace(/\s+/g, ' ');
  if (title.length < 3 || title.length > 80) return { ok: false, error: 'Give the challenge a title of 3 to 80 characters.' };
  const scope = ['weekly', 'class', 'subject', 'batch'].includes(i?.scope) ? i.scope : null; if (!scope) return { ok: false, error: 'Choose a challenge type.' };
  const re = /^\d{4}-\d{2}-\d{2}$/; if (!re.test(String(i?.startsOn)) || !re.test(String(i?.endsOn))) return { ok: false, error: 'Choose a start and end date.' };
  if (String(i.endsOn) < String(i.startsOn)) return { ok: false, error: 'The end date must not be before the start date.' };
  const size = Math.round(Number(i?.size ?? 8)); if (!(size >= 3 && size <= 20)) return { ok: false, error: 'Questions: 3 to 20.' };
  if (!i?.subjectId || !/^[0-9a-f-]{36}$/i.test(String(i.subjectId))) return { ok: false, error: 'Choose a subject.' };
  return { ok: true, value: { scope, title, subject_id: String(i.subjectId), size, starts_on: String(i.startsOn), ends_on: String(i.endsOn) } };
}
export async function createOrgChallenge(service: SupabaseClient, ownerUserId: string, input: any): Promise<string> {
  const c = cleanOrgChallenge(input); if (!c.ok) throw new Error(c.error);
  const { count: n } = await service.from('org_challenges').select('id', { count: 'exact', head: true }).eq('owner_user_id', ownerUserId).eq('active', true);
  if ((n ?? 0) >= 30) throw new Error('Too many open challenges. Close one first.');
  const { data, error } = await service.from('org_challenges').insert({ owner_user_id: ownerUserId, ...c.value }).select('id').single();
  if (error || !data) throw new Error('Could not create the challenge.');
  return data.id;
}
/** Open challenges from the tutors/centres this student is actively linked to. */
export async function challengesForStudent(service: SupabaseClient, studentId: string, now = new Date()) {
  const day = dayOf(now);
  const { data: links } = await service.from('student_links').select('adult_user_id, link_type').eq('student_id', studentId).eq('status', 'active').in('link_type', ['tutor', 'centre']);
  const owners = ((links ?? []) as any[]).map((l) => l.adult_user_id); if (!owners.length) return [];
  const { data: chs } = await service.from('org_challenges').select('id, title, scope, subject_id, size, starts_on, ends_on, owner_user_id').in('owner_user_id', owners).eq('active', true).lte('starts_on', day).gte('ends_on', day).limit(20);
  const list = (chs ?? []) as any[]; if (!list.length) return [];
  const { data: mine } = await service.from('challenge_attempts').select('org_challenge_id, status, correct, total').eq('student_id', studentId).in('org_challenge_id', list.map((c) => c.id));
  const mineBy = new Map(((mine ?? []) as any[]).map((m) => [m.org_challenge_id, m]));
  const out = [];
  for (const c of list) {
    const { data: links2 } = await service.from('student_links').select('student_id').eq('adult_user_id', c.owner_user_id).eq('status', 'active');
    const group = ((links2 ?? []) as any[]).map((l) => l.student_id);
    const { count } = group.length ? await service.from('challenge_attempts').select('id', { count: 'exact', head: true }).eq('org_challenge_id', c.id).eq('status', 'completed').in('student_id', group) : { count: 0 };
    const m: any = mineBy.get(c.id);
    out.push({ id: c.id, title: c.title, scope: c.scope, size: c.size, endsOn: c.ends_on, done: m?.status === 'completed', myScore: m?.status === 'completed' ? `${m.correct} of ${m.total}` : null, groupSize: group.length, groupFinished: count ?? 0 });
  }
  return out;
}
export async function orgChallengeStats(service: SupabaseClient, ownerUserId: string, challengeId: string, idx: Map<string, SkillInfo>) {
  const { data: ch } = await service.from('org_challenges').select('*').eq('id', challengeId).eq('owner_user_id', ownerUserId).maybeSingle();
  if (!ch) return null;
  const { data: links } = await service.from('student_links').select('student_id').eq('adult_user_id', ownerUserId).eq('status', 'active');
  const group = ((links ?? []) as any[]).map((l) => l.student_id);
  const { data: atts } = group.length ? await service.from('challenge_attempts').select('student_id, status, accuracy, answers, plan, started_at').eq('org_challenge_id', challengeId).in('student_id', group) : { data: [] };
  const done = ((atts ?? []) as any[]).filter((a) => a.status === 'completed');
  const accs = done.map((a) => Number(a.accuracy)).filter((x) => Number.isFinite(x));
  // Improvement: each finisher's challenge accuracy against their own earlier average (before the challenge started). Needs enough finishers.
  const deltas: number[] = [];
  for (const a of done) { const { data: prior } = await service.from('challenge_attempts').select('accuracy, total').eq('student_id', a.student_id).eq('status', 'completed').lt('started_at', ch.starts_on).gte('total', 5).limit(30); const p = ((prior ?? []) as any[]).map((r) => Number(r.accuracy)); if (p.length) deltas.push(Number(a.accuracy) - p.reduce((x, y) => x + y, 0) / p.length); }
  const wrongBy = new Map<string, number>();
  for (const a of done) (a.answers ?? []).forEach((r: any, i: number) => { if (!r.correct) { const sk = a.plan?.[i]?.skillId; if (sk) wrongBy.set(sk, (wrongBy.get(sk) ?? 0) + 1); } });
  const weak = [...wrongBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sk, n]) => ({ topic: idx.get(sk)?.name ?? 'A skill', wrong: n }));
  return { title: ch.title, groupSize: group.length, started: (atts ?? []).length, finished: done.length, participationPct: group.length ? Math.round((done.length / group.length) * 100) : null, averageAccuracy: done.length >= 1 ? Math.round(accs.reduce((x, y) => x + y, 0) / accs.length) : null, improvement: deltas.length >= MIN_N ? Math.round((deltas.reduce((x, y) => x + y, 0) / deltas.length) * 10) / 10 : null, weakTopics: weak };
}
