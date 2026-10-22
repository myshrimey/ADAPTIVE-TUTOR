import type { SupabaseClient } from '@supabase/supabase-js';
import { extractString } from '../question-engine/grading';
import { loadSubjectCatalogue } from '../subjects/subject.service';
import { categoryForTag } from './categories';
import { featureOn, type EngagementSettings } from './config';
import { composeMission, itemProgress, type MissionEvidence, type MissionPlan } from './missions';
import { evaluateAchievements, bestImprovement, mockImproved, EMPTY_METRICS, type AchievementDef, type AchievementMetrics } from './achievements';
import { awardXp, dayBounds, getEngagementRow, logEngagementEvent, activeDays, type SkillInfo } from './store';
import { recordMistake, mistakeCounts } from './mistakes';
import { recordBest } from './bests';
import { dayOf, streakInfo } from './streak';

// Turns what the student already does (lessons, diagnostics, mocks, practice answers) into engagement records. Everything here is IDEMPOTENT:
// XP is unique per source reference, a mistake is counted once per source, and a personal best only changes when a score is higher. Running it twice changes nothing.
export interface SyncCtx { idx: Map<string, SkillInfo>; settings: EngagementSettings; now?: Date }
const MIN_ANSWERS_FOR_LESSON = 3;

export async function syncSources(service: SupabaseClient, studentId: string, ctx: SyncCtx): Promise<void> {
  const now = ctx.now ?? new Date(); const s = ctx.settings;
  const row = await getEngagementRow(service, studentId);
  const since = row.sync_cursor ?? new Date(now.getTime() - s.xp.backfill_days * 86400000).toISOString();
  const xpOn = featureOn(s, studentId, 'xp');

  // 1. Learning sessions finished: XP for sessions with real practice in them.
  const { data: sessions } = await service.from('learning_sessions').select('id, skill_id').eq('student_id', studentId).eq('status', 'completed').gte('completed_at', since).limit(300);
  const sids = ((sessions ?? []) as any[]).map((x) => x.id);
  if (sids.length) {
    const { data: att } = await service.from('question_attempts').select('session_id, is_correct').in('session_id', sids).limit(5000);
    const by = new Map<string, { n: number; c: number }>();
    for (const a of (att ?? []) as any[]) { const x = by.get(a.session_id) ?? { n: 0, c: 0 }; x.n++; if (a.is_correct) x.c++; by.set(a.session_id, x); }
    for (const id of sids) { const x = by.get(id); if (xpOn && x && x.n >= MIN_ANSWERS_FOR_LESSON) await awardXp(service, studentId, { amount: s.xp.learning_session + Math.min(s.xp.learning_session_correct_cap, x.c), kind: 'session', ref: `ls:${id}`, note: 'learning session' }); }
  }
  // 2. Wrong answers in lessons go into the Mistake Book. The category comes only from a misconception the system already detected.
  const { data: wrong } = await service.from('question_attempts').select('id, question_id, answer, detected_misconception_id').eq('student_id', studentId).eq('is_correct', false).gte('created_at', since).order('created_at').limit(400);
  const w = (wrong ?? []) as any[];
  if (w.length) {
    const qids = [...new Set(w.map((x) => x.question_id))]; const qmap = new Map<string, any>();
    for (let i = 0; i < qids.length; i += 200) { const { data } = await service.from('questions').select('id, skill_id, expected_answer').in('id', qids.slice(i, i + 200)); for (const q of (data ?? []) as any[]) qmap.set(q.id, q); }
    const mids = [...new Set(w.map((x) => x.detected_misconception_id).filter(Boolean))]; const tag = new Map<string, string>();
    if (mids.length) { const { data } = await service.from('misconceptions').select('id, tag').in('id', mids); for (const m of (data ?? []) as any[]) tag.set(m.id, m.tag); }
    for (const a of w) { const q = qmap.get(a.question_id); if (!q) continue; const info = ctx.idx.get(q.skill_id);
      await recordMistake(service, studentId, { questionTable: 'questions', questionId: q.id, skillId: q.skill_id, subjectId: info?.subjectId ?? null, chapterId: info?.chapterId ?? null, studentAnswer: extractString(a.answer), correctAnswer: extractString(q.expected_answer), category: categoryForTag(tag.get(a.detected_misconception_id)), source: 'lesson', ref: `qa:${a.id}` }); }
  }
  // 3. Diagnostics finished: XP, and wrong answers into the Mistake Book.
  const { data: diags } = await service.from('diagnostic_attempts').select('id, diagnostic_tests(subject_id)').eq('student_id', studentId).eq('status', 'completed').gte('completed_at', since).limit(100);
  const dl = (diags ?? []) as any[];
  for (const d of dl) if (xpOn) await awardXp(service, studentId, { amount: s.xp.diagnostic, kind: 'diagnostic', ref: `da:${d.id}`, note: 'diagnostic' });
  if (dl.length) {
    const { data: ans } = await service.from('diagnostic_answers').select('diagnostic_attempt_id, diagnostic_question_id, answer').in('diagnostic_attempt_id', dl.map((d) => d.id)).eq('is_correct', false).limit(1500);
    const a = (ans ?? []) as any[]; const qids = [...new Set(a.map((x) => x.diagnostic_question_id))]; const qmap = new Map<string, any>();
    for (let i = 0; i < qids.length; i += 200) { const { data } = await service.from('diagnostic_questions').select('id, skill_id, expected_answer').in('id', qids.slice(i, i + 200)); for (const q of (data ?? []) as any[]) qmap.set(q.id, q); }
    for (const x of a) { const q = qmap.get(x.diagnostic_question_id); if (!q) continue; const info = ctx.idx.get(q.skill_id);
      await recordMistake(service, studentId, { questionTable: 'diagnostic_questions', questionId: q.id, skillId: q.skill_id, subjectId: info?.subjectId ?? null, chapterId: info?.chapterId ?? null, studentAnswer: extractString(x.answer), correctAnswer: extractString(q.expected_answer), category: null, source: 'diagnostic', ref: `da:${x.diagnostic_attempt_id}` }); }
  }
  // 4. Mocks submitted: XP, personal best and wrong answers.
  const { data: mocks } = await service.from('mock_exams').select('id, subject_id, score, total, result').eq('student_id', studentId).eq('status', 'submitted').gte('submitted_at', since).limit(60);
  for (const m of (mocks ?? []) as any[]) {
    if (xpOn) await awardXp(service, studentId, { amount: s.xp.mock_complete, kind: 'mock', ref: `mock:${m.id}`, note: 'mock' });
    const pct = m.total ? Math.round(((m.score ?? 0) / m.total) * 100) : null;
    if (featureOn(s, studentId, 'personal_best') && pct !== null && (m.total ?? 0) >= 5) await recordBest(service, studentId, 'mock_score', m.subject_id, pct, s);
    for (const r of (m.result?.review ?? []) as any[]) { if (!r.answered || r.isCorrect) continue; const { data: q } = await service.from('diagnostic_questions').select('id, skill_id').eq('id', r.questionId).maybeSingle(); if (!q) continue; const info = ctx.idx.get(q.skill_id);
      await recordMistake(service, studentId, { questionTable: 'diagnostic_questions', questionId: q.id, skillId: q.skill_id, subjectId: info?.subjectId ?? m.subject_id, chapterId: info?.chapterId ?? null, studentAnswer: String(r.yourAnswer ?? ''), correctAnswer: String(r.correctAnswer ?? ''), category: null, source: 'mock', ref: `mock:${m.id}` }); }
  }
  await service.from('student_engagement').update({ sync_cursor: now.toISOString(), updated_at: now.toISOString() }).eq('student_id', studentId);
}

export async function refreshStreak(service: SupabaseClient, studentId: string, ctx: SyncCtx) {
  const days = await activeDays(service, studentId, 400, ctx.now);
  const info = streakInfo(days, ctx.now);
  const row = await getEngagementRow(service, studentId);
  const longest = Math.max(row.longest_streak ?? 0, info.longest);
  await service.from('student_engagement').update({ current_streak: info.current, longest_streak: longest, last_active_day: info.lastDay, updated_at: new Date().toISOString() }).eq('student_id', studentId);
  if (featureOn(ctx.settings, studentId, 'personal_best') && longest >= 2) await recordBest(service, studentId, 'best_streak', '', longest, ctx.settings, ' days');
  return { ...info, longest };
}

async function seriesBySubject(service: SupabaseClient, studentId: string) {
  const items: { at: string; subjectId: string; pct: number; mock: boolean }[] = [];
  const { data: ch } = await service.from('challenge_attempts').select('subject_id, accuracy, total, completed_at, mode').eq('student_id', studentId).eq('status', 'completed').in('mode', ['practice', 'challenge', 'mixed', 'boss', 'weakness', 'org', 'friend', 'session_quiz']).gte('total', 5).limit(1000);
  for (const r of (ch ?? []) as any[]) if (r.subject_id && r.accuracy !== null) items.push({ at: r.completed_at, subjectId: r.subject_id, pct: Number(r.accuracy), mock: false });
  const { data: mk } = await service.from('mock_exams').select('subject_id, score, total, submitted_at').eq('student_id', studentId).eq('status', 'submitted').gte('total', 5).limit(200);
  for (const r of (mk ?? []) as any[]) items.push({ at: r.submitted_at, subjectId: r.subject_id, pct: Math.round((r.score / r.total) * 100), mock: true });
  items.sort((a, b) => (a.at < b.at ? -1 : 1));
  const all: Record<string, number[]> = {}, mocks: Record<string, number[]> = {};
  for (const i of items) { (all[i.subjectId] ??= []).push(i.pct); if (i.mock) (mocks[i.subjectId] ??= []).push(i.pct); }
  return { all, mocks, items };
}

export async function achievementMetrics(service: SupabaseClient, studentId: string, ctx: SyncCtx, longestStreak: number): Promise<AchievementMetrics> {
  const m: AchievementMetrics = { ...EMPTY_METRICS, longest_streak: longestStreak };
  const [diags, sessions, mastery, quizEv, mocksN, hard, rev, corrected, chAtt, series] = await Promise.all([
    service.from('diagnostic_attempts').select('chapter_id').eq('student_id', studentId).eq('status', 'completed').limit(500),
    service.from('learning_sessions').select('id').eq('student_id', studentId).eq('status', 'completed').limit(2000),
    service.from('mastery_states').select('skill_id, score').eq('student_id', studentId).limit(3000),
    service.from('learning_events').select('payload').eq('student_id', studentId).eq('event_type', 'post_session_quiz_completed').limit(1000),
    service.from('mock_exams').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'submitted'),
    service.from('challenge_attempts').select('accuracy, total').eq('student_id', studentId).eq('status', 'completed').in('mode', ['challenge', 'boss']).limit(500),
    service.from('challenge_attempts').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'completed').in('mode', ['mistake_review', 'comeback']),
    service.from('engagement_events').select('payload').eq('student_id', studentId).eq('kind', 'mistake_corrected').limit(2000),
    service.from('challenge_attempts').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'completed').not('chapter_id', 'is', null).gte('total', 5),
    seriesBySubject(service, studentId),
  ]);
  const dl = (diags.data ?? []) as any[];
  m.diagnostics_done = dl.length; m.subject_checkpoints = dl.filter((d) => !d.chapter_id).length; m.chapter_checkpoints = dl.filter((d) => d.chapter_id).length + (chAtt.count ?? 0);
  const sids = ((sessions.data ?? []) as any[]).map((x) => x.id);
  if (sids.length) { const counts = new Map<string, number>(); for (let i = 0; i < sids.length; i += 300) { const { data } = await service.from('question_attempts').select('session_id').in('session_id', sids.slice(i, i + 300)).limit(20000); for (const a of (data ?? []) as any[]) counts.set(a.session_id, (counts.get(a.session_id) ?? 0) + 1); } m.lessons_done = [...counts.values()].filter((n) => n >= MIN_ANSWERS_FOR_LESSON).length; }
  const ms = ((mastery.data ?? []) as any[]).map((r) => ({ id: r.skill_id as string, score: Number(r.score) }));
  m.skills_mastered = ms.filter((r) => r.score >= 90).length;
  const chapters = new Map<string, { total: number; scores: number[] }>();
  for (const info of ctx.idx.values()) { const c = chapters.get(info.chapterId) ?? { total: 0, scores: [] }; c.total++; chapters.set(info.chapterId, c); }
  for (const r of ms) { const info = ctx.idx.get(r.id); if (info) chapters.get(info.chapterId)?.scores.push(r.score); }
  m.chapters_mastered = [...chapters.values()].filter((c) => c.scores.length / c.total >= 0.7 && c.scores.every((x) => x >= 75)).length;
  m.quizzes_done = ((quizEv.data ?? []) as any[]).filter((e) => Number(e.payload?.total) >= 5).length;
  m.mocks_done = mocksN.count ?? 0;
  m.hard_challenges = ((hard.data ?? []) as any[]).filter((r) => r.total >= 5 && Number(r.accuracy) >= 50).length;
  m.revision_rounds = rev.count ?? 0;
  const ev = (corrected.data ?? []) as any[]; m.mistakes_corrected = ev.length; m.repeat_mistakes_corrected = ev.filter((e) => Number(e.payload?.repetitions) >= 2).length;
  m.best_improvement = bestImprovement(series.all); m.mock_improved = mockImproved(series.mocks);
  return m;
}

export async function loadAchievementDefs(service: SupabaseClient): Promise<AchievementDef[]> {
  const { data } = await service.from('achievements').select('*').eq('active', true).order('sort');
  return ((data ?? []) as any[]).map((r) => ({ code: r.code, category: r.category, title: r.title, description: r.description, metric: r.metric, threshold: Number(r.threshold), xp: r.xp, sort: r.sort, active: r.active }));
}
export async function unlockAchievements(service: SupabaseClient, studentId: string, ctx: SyncCtx, longest: number): Promise<{ unlocked: AchievementDef[]; metrics: AchievementMetrics | null }> {
  if (!featureOn(ctx.settings, studentId, 'achievements')) return { unlocked: [], metrics: null };
  const [defs, have, metrics] = await Promise.all([loadAchievementDefs(service), service.from('student_achievements').select('code').eq('student_id', studentId), achievementMetrics(service, studentId, ctx, longest)]);
  const unlocked = new Set(((have.data ?? []) as any[]).map((r) => r.code as string));
  const fresh = evaluateAchievements(metrics, defs, unlocked); const out: AchievementDef[] = [];
  for (const f of fresh) {
    const { error } = await service.from('student_achievements').insert({ student_id: studentId, code: f.def.code, evidence: { metric: f.def.metric, value: f.value } });
    if (error) continue;
    out.push(f.def); await logEngagementEvent(service, studentId, 'achievement_unlocked', f.def.code, { value: f.value });
    if (featureOn(ctx.settings, studentId, 'xp')) await awardXp(service, studentId, { amount: f.def.xp, kind: 'achievement', ref: `ach:${f.def.code}`, note: f.def.title });
  }
  return { unlocked: out, metrics };
}

// ---- Today's mission ----
export interface MissionState { id: string; day: string; title: string; status: 'open' | 'complete'; items: { id: string; kind: string; label: string; target: number; progress: number; done: boolean; href: string | null; subjectId: string | null; skillId: string | null }[] }

async function lastPracticeBySubject(service: SupabaseClient, studentId: string, ctx: SyncCtx): Promise<Map<string, string>> {
  const since = new Date((ctx.now ?? new Date()).getTime() - 30 * 86400000).toISOString(); const last = new Map<string, string>();
  const put = (sid: string | null | undefined, at: string | null) => { if (sid && at && (!last.has(sid) || last.get(sid)! < at)) last.set(sid, at); };
  const [c, q, d] = await Promise.all([
    service.from('challenge_attempts').select('subject_id, started_at').eq('student_id', studentId).gte('started_at', since).limit(500),
    service.from('learning_sessions').select('skill_id, started_at').eq('student_id', studentId).gte('started_at', since).limit(500),
    service.from('diagnostic_attempts').select('started_at, diagnostic_tests(subject_id)').eq('student_id', studentId).gte('started_at', since).limit(200),
  ]);
  for (const r of (c.data ?? []) as any[]) put(r.subject_id, r.started_at);
  for (const r of (q.data ?? []) as any[]) put(ctx.idx.get(r.skill_id)?.subjectId, r.started_at);
  for (const r of (d.data ?? []) as any[]) put(r.diagnostic_tests?.subject_id, r.started_at);
  return last;
}

export async function buildMissionPlan(service: SupabaseClient, studentId: string, ctx: SyncCtx): Promise<MissionPlan> {
  const now = ctx.now ?? new Date();
  const [cat, mastery, mc, diag, bests, last] = await Promise.all([
    loadSubjectCatalogue(service, studentId),
    service.from('mastery_states').select('skill_id, score').eq('student_id', studentId).limit(3000),
    mistakeCounts(service, studentId),
    service.from('diagnostic_attempts').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'completed'),
    service.from('personal_bests').select('kind, scope_id, previous_value, achieved_at').eq('student_id', studentId).in('kind', ['quiz_score', 'mock_score']).not('previous_value', 'is', null).gte('achieved_at', new Date(now.getTime() - 7 * 86400000).toISOString()).limit(5),
    lastPracticeBySubject(service, studentId, ctx),
  ]);
  const usable = cat.filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  const subjects = usable.map((c) => { const l = last.get(c.id); return { id: c.id, name: c.name, daysSincePractice: l ? Math.floor((now.getTime() - new Date(l).getTime()) / 86400000) : null }; });
  const usableIds = new Set(usable.map((c) => c.id));
  const weakAll = ((mastery.data ?? []) as any[]).map((r) => ({ id: r.skill_id as string, score: Number(r.score) })).filter((r) => r.score < 60).sort((a, b) => a.score - b.score);
  const weakSkills: any[] = [];
  for (const r of weakAll) { const info = ctx.idx.get(r.id); if (!info || !usableIds.has(info.subjectId)) continue; weakSkills.push({ skillId: info.skillId, name: info.name, chapterName: info.chapterName, subjectId: info.subjectId, subjectName: info.subjectName, score: r.score }); if (weakSkills.length >= 3) break; }
  const imp = ((bests.data ?? []) as any[])[0]; const impInfo = imp ? subjects.find((s) => s.id === imp.scope_id) : null;
  return composeMission({ hasDiagnostic: (diag.count ?? 0) > 0, openMistakes: mc.open, calculationMistakes: mc.calculation, weakSkills, subjects, recentImprovement: impInfo ? { subjectId: impInfo.id, name: impInfo.name } : null, dailyAvailable: ctx.settings.features.daily_challenge && subjects.length > 0, settings: ctx.settings });
}

export async function missionEvidence(service: SupabaseClient, studentId: string, day: string): Promise<MissionEvidence> {
  const b = dayBounds(day);
  const [qa, da, dd, ch] = await Promise.all([
    service.from('question_attempts').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('created_at', b.from).lt('created_at', b.to),
    service.from('diagnostic_attempts').select('id').eq('student_id', studentId).gte('started_at', new Date(new Date(b.from).getTime() - 86400000).toISOString()).limit(20),
    service.from('diagnostic_attempts').select('id').eq('student_id', studentId).eq('status', 'completed').gte('completed_at', b.from).lt('completed_at', b.to).limit(5),
    service.from('challenge_attempts').select('mode, status, skill_id, subject_id, answers, completed_at').eq('student_id', studentId).gte('started_at', new Date(new Date(b.from).getTime() - 86400000).toISOString()).limit(200),
  ]);
  let dAns = 0; const dids = ((da.data ?? []) as any[]).map((x) => x.id);
  if (dids.length) { const { count } = await service.from('diagnostic_answers').select('id', { count: 'exact', head: true }).in('diagnostic_attempt_id', dids).gte('responded_at', b.from).lt('responded_at', b.to); dAns = count ?? 0; }
  const ev: MissionEvidence = { questionsToday: (qa.count ?? 0) + dAns, diagnosticToday: ((dd.data ?? []) as any[]).length > 0, mistakesReviewedToday: 0, reviewedByCategory: {}, weaknessDoneToday: new Set(), practiceSubjectsToday: new Set(), challengeDoneToday: false, dailyDoneToday: false };
  for (const r of (ch.data ?? []) as any[]) {
    for (const a of r.answers ?? []) { if (!a.at || a.at < b.from || a.at >= b.to) continue; ev.questionsToday++; if (a.role === 'retry') { ev.mistakesReviewedToday++; if (a.category) ev.reviewedByCategory[a.category] = (ev.reviewedByCategory[a.category] ?? 0) + 1; } }
    const doneToday = r.status === 'completed' && r.completed_at && r.completed_at >= b.from && r.completed_at < b.to;
    if (!doneToday) continue;
    if (r.mode === 'daily') ev.dailyDoneToday = true;
    if (r.mode === 'challenge' || r.mode === 'boss') ev.challengeDoneToday = true;
    if (r.mode === 'weakness' && r.skill_id && (r.answers ?? []).length >= 3) ev.weaknessDoneToday.add(r.skill_id);
    if (['practice', 'challenge', 'mixed', 'weakness', 'boss', 'org', 'friend'].includes(r.mode) && r.subject_id) ev.practiceSubjectsToday.add(r.subject_id);
  }
  return ev;
}

/** Makes today's mission if there is none yet, updates its progress from today's evidence and pays the mission XP once when every item is done. */
export async function refreshMission(service: SupabaseClient, studentId: string, ctx: SyncCtx): Promise<MissionState | null> {
  if (!featureOn(ctx.settings, studentId, 'missions')) return null;
  const day = dayOf(ctx.now ?? new Date());
  let { data: m } = await service.from('daily_missions').select('*').eq('student_id', studentId).eq('day', day).maybeSingle();
  if (!m) {
    const plan = await buildMissionPlan(service, studentId, ctx);
    if (!plan.items.length) return null;
    const ins = await service.from('daily_missions').insert({ student_id: studentId, day, title: plan.title }).select('*').single();
    if (ins.error || !ins.data) { const again = await service.from('daily_missions').select('*').eq('student_id', studentId).eq('day', day).maybeSingle(); m = again.data; }
    else { m = ins.data; await service.from('mission_items').insert(plan.items.map((it, i) => ({ mission_id: m!.id, position: i, kind: it.kind, label: it.label, target: it.target, subject_id: it.subjectId ?? null, skill_id: it.skillId ?? null, href: it.category ? `${it.href}` : it.href }))); }
  }
  if (!m) return null;
  const [{ data: items }, ev] = await Promise.all([service.from('mission_items').select('*').eq('mission_id', m.id).order('position'), missionEvidence(service, studentId, day)]);
  const out: MissionState['items'] = [];
  for (const it of (items ?? []) as any[]) {
    const cat = typeof it.href === 'string' && /category=([a-z]+)/.exec(it.href)?.[1];
    const p = itemProgress({ kind: it.kind, target: it.target, skillId: it.skill_id, subjectId: it.subject_id, category: cat || null }, ev);
    const done = p >= it.target;
    if (p !== it.progress || done !== it.done) await service.from('mission_items').update({ progress: p, done }).eq('id', it.id);
    out.push({ id: it.id, kind: it.kind, label: it.label, target: it.target, progress: p, done, href: it.href, subjectId: it.subject_id, skillId: it.skill_id });
  }
  let status = m.status as 'open' | 'complete';
  if (out.length && out.every((x) => x.done) && status === 'open') {
    status = 'complete';
    await service.from('daily_missions').update({ status: 'complete', completed_at: new Date().toISOString() }).eq('id', m.id);
    await logEngagementEvent(service, studentId, 'mission_completed', day, { items: out.length });
    if (featureOn(ctx.settings, studentId, 'xp')) await awardXp(service, studentId, { amount: ctx.settings.xp.mission_complete, kind: 'mission', ref: `mission:${day}`, note: 'mission complete' });
  }
  return { id: m.id, day, title: m.title, status, items: out };
}

/** Everything that should be brought up to date after the student did something. Safe to call as often as needed. */
export async function afterActivity(service: SupabaseClient, studentId: string, ctx: SyncCtx) {
  await syncSources(service, studentId, ctx);
  const streak = await refreshStreak(service, studentId, ctx);
  const { unlocked, metrics } = await unlockAchievements(service, studentId, ctx, streak.longest);
  const mission = await refreshMission(service, studentId, ctx);
  return { streak, unlocked, metrics, mission };
}
