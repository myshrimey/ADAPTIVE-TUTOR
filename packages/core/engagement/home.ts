import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSubjectCatalogue } from '../subjects/subject.service';
import { featureOn, type EngagementSettings } from './config';
import { afterActivity, loadAchievementDefs, missionEvidence, type MissionState, type SyncCtx } from './sync';
import { dayBounds, getEngagementRow, xpToday, type SkillInfo } from './store';
import { mistakeCounts } from './mistakes';
import { loadBests } from './bests';
import { achievementProgress, type AchievementDef } from './achievements';
import { computeJourney, type Journey } from './journey';
import { BEST_LABEL, type BestKind } from './personal-best';
import { composeNotices, WEEKLY_GOAL_DAYS } from './notices';
import { dayOf, type StreakInfo } from './streak';

export interface EngagementHome {
  settings: EngagementSettings;
  on: Record<string, boolean>;
  streak: StreakInfo; xpTotal: number; xpToday: number;
  mission: MissionState | null;
  battles: { skillId: string; name: string; chapterName: string; subjectName: string; subjectId: string; score: number }[];
  daily: { subjectId: string; subjectName: string; done: boolean }[];
  mistakes: { open: number; corrected: number };
  achievements: { unlocked: { code: string; title: string; description: string; category: string; at: string }[]; next: { code: string; title: string; description: string; progress: number }[]; newlyUnlocked: string[]; total: number };
  bests: { label: string; scope: string; value: number; previous: number | null; unit: string }[];
  journeys: { subjectId: string; subjectName: string; journey: Journey }[];
  achievedToday: string[];
  nextStep: string;
  notices: string[];
  leaderboard: { optedIn: boolean; nickname: string | null };
}

export async function loadEngagementHome(service: SupabaseClient, studentId: string, ctx: SyncCtx & { idx: Map<string, SkillInfo> }): Promise<EngagementHome> {
  const now = ctx.now ?? new Date(); const day = dayOf(now); const b = dayBounds(day); const s = ctx.settings;
  const act = await afterActivity(service, studentId, ctx);
  const [row, xpT, mc, bests, defs, got, cat, mastery] = await Promise.all([
    getEngagementRow(service, studentId), xpToday(service, studentId, now), mistakeCounts(service, studentId), loadBests(service, studentId), loadAchievementDefs(service),
    service.from('student_achievements').select('code, unlocked_at').eq('student_id', studentId),
    loadSubjectCatalogue(service, studentId),
    service.from('mastery_states').select('skill_id, score').eq('student_id', studentId).limit(3000),
  ]);
  const usable = cat.filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  const usableIds = new Set(usable.map((c) => c.id));
  const mrows = ((mastery.data ?? []) as any[]).map((r) => ({ id: r.skill_id as string, score: Number(r.score) }));
  const battles = mrows.filter((r) => r.score < 60).sort((a, b2) => a.score - b2.score).map((r) => ({ r, info: ctx.idx.get(r.id) })).filter((x) => x.info && usableIds.has(x.info.subjectId)).slice(0, 3).map(({ r, info }) => ({ skillId: info!.skillId, name: info!.name, chapterName: info!.chapterName, subjectName: info!.subjectName, subjectId: info!.subjectId, score: Math.round(r.score) }));

  const { data: dailyRows } = await service.from('challenge_attempts').select('ref, status').eq('student_id', studentId).eq('mode', 'daily').like('ref', `${day}:%`);
  const doneRefs = new Map(((dailyRows ?? []) as any[]).map((r) => [r.ref as string, r.status as string]));
  const daily = featureOn(s, studentId, 'daily_challenge') ? usable.map((c) => ({ subjectId: c.id, subjectName: c.name, done: doneRefs.get(`${day}:${c.id}`) === 'completed' })) : [];

  const unlockedMap = new Map(((got.data ?? []) as any[]).map((r) => [r.code as string, r.unlocked_at as string]));
  const defByCode = new Map(defs.map((d) => [d.code, d]));
  const unlocked = [...unlockedMap.entries()].map(([code, at]) => ({ d: defByCode.get(code), at })).filter((x) => x.d).sort((a, b2) => (a.at < b2.at ? 1 : -1)).map(({ d, at }) => ({ code: d!.code, title: d!.title, description: d!.description, category: d!.category, at }));
  const metrics = act.metrics ?? {};
  const next = defs.filter((d: AchievementDef) => !unlockedMap.has(d.code)).map((d) => ({ code: d.code, title: d.title, description: d.description, progress: achievementProgress(metrics, d) })).sort((a, b2) => b2.progress - a.progress).slice(0, 3);

  const subjName = new Map<string, string>([...ctx.idx.values()].map((i) => [i.subjectId, i.subjectName] as [string, string]));
  const bestsOut = featureOn(s, studentId, 'personal_best') ? bests.map((x) => ({ label: BEST_LABEL[x.kind as BestKind] ?? x.kind, scope: subjName.get(x.scopeId) ?? '', value: x.value, previous: x.previous, unit: x.kind === 'best_streak' ? ' days' : x.kind === 'mistakes_corrected_day' ? '' : '%' })) : [];

  // Study journey per subject, from recorded evidence.
  const journeys: EngagementHome['journeys'] = [];
  if (usable.length) {
    const [diag, att, ch, mk] = await Promise.all([
      service.from('diagnostic_attempts').select('diagnostic_tests(subject_id)').eq('student_id', studentId).eq('status', 'completed').limit(500),
      service.from('question_attempts').select('questions(skill_id)').eq('student_id', studentId).limit(5000),
      service.from('challenge_attempts').select('subject_id, mode, answers').eq('student_id', studentId).eq('status', 'completed').limit(1000),
      service.from('mock_exams').select('subject_id').eq('student_id', studentId).eq('status', 'submitted').limit(200),
    ]);
    const cnt = (m: Map<string, number>, k: string | null | undefined, n = 1) => { if (k) m.set(k, (m.get(k) ?? 0) + n); };
    const diagBy = new Map<string, number>(), qBy = new Map<string, number>(), battleBy = new Map<string, number>(), mockBy = new Map<string, number>();
    for (const r of (diag.data ?? []) as any[]) cnt(diagBy, r.diagnostic_tests?.subject_id);
    for (const r of (att.data ?? []) as any[]) cnt(qBy, ctx.idx.get(r.questions?.skill_id)?.subjectId);
    for (const r of (ch.data ?? []) as any[]) { cnt(qBy, r.subject_id, (r.answers ?? []).length); if (r.mode === 'weakness') cnt(battleBy, r.subject_id); }
    for (const r of (mk.data ?? []) as any[]) cnt(mockBy, r.subject_id);
    for (const c of usable) {
      const skills = [...ctx.idx.values()].filter((i) => i.subjectId === c.id); const total = skills.length;
      const ms = mrows.filter((r) => ctx.idx.get(r.id)?.subjectId === c.id);
      const chapters = new Map<string, { total: number; scores: number[] }>();
      for (const i of skills) { const e = chapters.get(i.chapterId) ?? { total: 0, scores: [] }; e.total++; chapters.set(i.chapterId, e); }
      for (const r of ms) { const i = ctx.idx.get(r.id)!; chapters.get(i.chapterId)?.scores.push(r.score); }
      const chaptersMastered = [...chapters.values()].filter((e) => e.scores.length / e.total >= 0.7 && e.scores.every((x) => x >= 75)).length;
      journeys.push({ subjectId: c.id, subjectName: c.name, journey: computeJourney({ diagnosticsCompleted: diagBy.get(c.id) ?? 0, skills: ms.map((r) => ({ score: r.score })), totalSkills: total, questionsAnswered: qBy.get(c.id) ?? 0, weaknessBattlesDone: battleBy.get(c.id) ?? 0, chaptersMastered, mocksDone: mockBy.get(c.id) ?? 0 }, c.id) });
    }
  }

  // "What you achieved" today, only from evidence.
  const { data: evs } = await service.from('engagement_events').select('kind, payload').eq('student_id', studentId).gte('created_at', b.from).lt('created_at', b.to).limit(200);
  const corrected = ((evs ?? []) as any[]).filter((e) => e.kind === 'mistake_corrected').length;
  const pbToday = ((evs ?? []) as any[]).filter((e) => e.kind === 'personal_best' && e.payload?.kind !== 'best_streak').length;
  const ev = await missionEvidence(service, studentId, day);
  const achievedToday: string[] = [];
  if (ev.questionsToday) achievedToday.push(`${ev.questionsToday} question${ev.questionsToday === 1 ? '' : 's'} answered`);
  if (corrected) achievedToday.push(`${corrected} mistake${corrected === 1 ? '' : 's'} corrected`);
  if (pbToday) achievedToday.push('New personal best');
  if (act.mission?.status === 'complete') achievedToday.push("Today's mission complete");

  const top = battles[0];
  const nextStep = top ? `Tomorrow: continue the ${top.chapterName || top.name} Weakness Battle` : mc.open > 0 ? `Tomorrow: review ${mc.open} mistake${mc.open === 1 ? '' : 's'} in your Mistake Book` : "Tomorrow: try a new CBSE Challenge of the Day";

  const weekStart = new Date(now.getTime() - ((new Date(now.getTime() + 5.5 * 3600000).getUTCDay() + 6) % 7) * 86400000);
  const wk = new Set(act.streak.weekDays.filter((d) => d.active && d.day >= dayOf(weekStart)).map((d) => d.day));
  const firstBest = bestsOut.find((x) => x.label === BEST_LABEL.quiz_score);
  const notices = featureOn(s, studentId, 'missions') ? composeNotices({ missionReady: !!act.mission, missionStarted: !!act.mission?.items.some((i) => i.progress > 0), openMistakes: mc.open, bestToBeat: firstBest ? { subject: firstBest.scope || 'this subject', value: firstBest.value } : null, activeDaysThisWeek: wk.size, weeklyGoalDays: WEEKLY_GOAL_DAYS, dayOfWeek: (new Date(now.getTime() + 5.5 * 3600000).getUTCDay() + 6) % 7 + 1, max: s.notifications.max_per_day }) : [];

  const on: Record<string, boolean> = {}; for (const f of ['missions', 'xp', 'streaks', 'achievements', 'personal_best', 'leaderboard', 'daily_challenge', 'boss']) on[f] = featureOn(s, studentId, f as any);
  return {
    settings: s, on, streak: act.streak, xpTotal: row.xp_total ?? 0, xpToday: xpT, mission: act.mission, battles, daily, mistakes: { open: mc.open, corrected: mc.corrected },
    achievements: { unlocked, next, newlyUnlocked: act.unlocked.map((u) => u.title), total: defs.length }, bests: bestsOut, journeys, achievedToday, nextStep, notices,
    leaderboard: { optedIn: !!row.leaderboard_opt_in, nickname: row.nickname ?? null },
  };
}
