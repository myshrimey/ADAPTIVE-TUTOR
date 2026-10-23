import { inputKindOf, validateAnswer, type InputKind } from '../answers/input';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { ensureExplanation } from '../explanations/ensure-explanation';
import { featureOn, type EngagementSettings } from './config';
import { attachFriendAttempt } from './friend-link';
import { xpForChallenge, suspiciousPattern, type AnswerRec, type ChallengeMode } from './xp';
import { composeBoss, composeChallenge, composeMixed, composePractice, pickDaily, nextBattleDifficulty, startDifficulty, MODE_SIZE, shuffle, type BankQ } from './challenge-policy';
import { applyRetry, recordMistake } from './mistakes';
import { awardXp, challengeXpToday, logEngagementEvent, type SkillInfo } from './store';
import { dayOf } from './streak';
import { MIN_QUESTIONS_FOR_BEST, type BestResult } from './personal-best';
import { recordBest } from './bests';
import { afterActivity } from './sync';

// One engine for every challenge mode. Questions come from the existing bank (diagnostic_questions; mistake retries may come from `questions`).
// Answer keys stay on the server: a question is sent without its key, and the key is returned only after the answer.
// Challenges NEVER change mastery_states. Mastery moves only through lessons and diagnostics.
export interface PlanItem { qid: string; table: 'diagnostic_questions' | 'questions'; role: 'normal' | 'retry' | 'similar'; mistakeId?: string; difficulty: number; skillId: string }
export interface StartOpts { mode: ChallengeMode; subjectId?: string; skillId?: string; chapterId?: string; category?: string; sourceAttemptId?: string; orgChallengeId?: string; friendChallengeId?: string }
export interface ServedQuestion { attemptId: string; index: number; total: number; mode: ChallengeMode; id: string; prompt: string; questionType: string; options: string[] | null; figureUrl: string | null; figureCaption: string | null; inputKind?: InputKind; role: PlanItem['role']; note: string | null }
export interface StartResult { attemptId: string; question: ServedQuestion | null; completed: boolean; notice: string | null }
export interface ChallengeSummary {
  mode: ChallengeMode; attempted: number; correct: number; accuracy: number | null; xp: { amount: number; breakdown: { label: string; xp: number }[]; capped: boolean };
  best: BestResult | null; mistakesCorrected: number; conceptNote: string | null; nextAction: { text: string; href: string };
  comeback: { original: { correct: number; total: number; percent: number }; now: { correct: number; total: number; percent: number }; corrected: number } | null; masteryNote: string;
}
export interface AnswerResult { correct: boolean; correctAnswer: string; explanation: string | null; done: boolean; next: ServedQuestion | null; summary: ChallengeSummary | null }
export interface EngineCtx { idx: Map<string, SkillInfo>; settings: EngagementSettings; ai?: AIProvider; now?: Date }

const MASTERY_NOTE = 'Challenges do not change your mastery scores. Mastery moves through lessons and diagnostics.';
const err = (m: string) => new Error(m);

async function masteryMap(service: SupabaseClient, studentId: string): Promise<Map<string, number>> {
  const { data } = await service.from('mastery_states').select('skill_id, score').eq('student_id', studentId);
  return new Map(((data ?? []) as any[]).map((r) => [r.skill_id as string, Number(r.score)]));
}
export async function recentQuestionIds(service: SupabaseClient, studentId: string, days: number, excludeAttempt?: string): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await service.from('challenge_attempts').select('id, answers').eq('student_id', studentId).gte('started_at', since).limit(500);
  const s = new Set<string>();
  for (const r of (data ?? []) as any[]) { if (r.id === excludeAttempt) continue; for (const a of r.answers ?? []) if (a?.qid) s.add(a.qid); }
  return s;
}
async function allAnsweredIds(service: SupabaseClient, studentId: string): Promise<Set<string>> {
  const { data } = await service.from('challenge_attempts').select('answers').eq('student_id', studentId).eq('mode', 'daily').limit(1000);
  const s = new Set<string>(); for (const r of (data ?? []) as any[]) for (const a of r.answers ?? []) if (a?.qid) s.add(a.qid); return s;
}

/** Question pool from the bank. `verifiedOnly` keeps boss and daily questions to ones a person has verified. Retired skills never appear (they are not in the curriculum index). */
export async function loadPool(service: SupabaseClient, ctx: EngineCtx, o: { subjectId?: string; skillIds?: string[]; verifiedOnly?: boolean }): Promise<BankQ[]> {
  let skillIds = o.skillIds;
  const cols = 'id, skill_id, difficulty, question_type, marks, cognitive_level';
  let rows: any[] = [];
  if (skillIds) {
    for (let i = 0; i < skillIds.length; i += 50) {
      let q = service.from('diagnostic_questions').select(cols).in('skill_id', skillIds.slice(i, i + 50)).neq('content_status', 'rejected').limit(3000);
      if (o.verifiedOnly) q = q.eq('content_status', 'verified');
      const { data } = await q; rows.push(...(data ?? []));
    }
  } else if (o.subjectId) {
    let q = service.from('diagnostic_questions').select(`${cols}, diagnostic_tests!inner(subject_id, is_active)`).eq('diagnostic_tests.subject_id', o.subjectId).eq('diagnostic_tests.is_active', true).neq('content_status', 'rejected').limit(4000);
    if (o.verifiedOnly) q = q.eq('content_status', 'verified');
    const { data } = await q; rows = data ?? [];
  }
  return rows.filter((r) => ctx.idx.has(r.skill_id)).map((r) => ({ id: r.id, skill_id: r.skill_id, difficulty: r.difficulty, question_type: r.question_type, marks: r.marks, cognitive_level: r.cognitive_level }));
}

function skillsOfChapter(ctx: EngineCtx, chapterId: string): string[] { return [...ctx.idx.values()].filter((s) => s.chapterId === chapterId).map((s) => s.skillId); }

export async function serveQuestion(service: SupabaseClient, attempt: any, index: number, note: string | null = null): Promise<ServedQuestion | null> {
  const item: PlanItem | undefined = (attempt.plan ?? [])[index]; if (!item) return null;
  const { data: q } = await service.from(item.table).select('id, prompt, question_type, options, figure_url, figure_caption, expected_answer').eq('id', item.qid).maybeSingle();
  if (!q) return null;
  return { attemptId: attempt.id, index, total: attempt.total, mode: attempt.mode, id: q.id, prompt: q.prompt, questionType: q.question_type, options: q.options ?? null, figureUrl: q.figure_url ?? null, figureCaption: q.figure_caption ?? null, inputKind: inputKindOf(q.question_type, q.expected_answer), role: item.role, note };
}

const toPlan = (qs: BankQ[], role: PlanItem['role'] = 'normal'): PlanItem[] => qs.map((q) => ({ qid: q.id, table: 'diagnostic_questions', role, difficulty: q.difficulty, skillId: q.skill_id }));

/** A similar question: same skill, nearest difficulty, not the original and not recently seen. */
function similarTo(pool: BankQ[], skillId: string, difficulty: number, avoid: Set<string>): BankQ | null {
  const c = pool.filter((q) => q.skill_id === skillId && !avoid.has(q.id)).sort((a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty));
  return c[0] ?? null;
}

export async function startChallenge(service: SupabaseClient, studentId: string, o: StartOpts, ctx: EngineCtx): Promise<StartResult> {
  const now = ctx.now ?? new Date(); const day = dayOf(now);
  const mastery = await masteryMap(service, studentId);
  const seen = await recentQuestionIds(service, studentId, ctx.settings.xp.recent_question_days);
  const skillInfo = o.skillId ? ctx.idx.get(o.skillId) : undefined;
  const subjectId = o.subjectId ?? skillInfo?.subjectId ?? (o.chapterId ? [...ctx.idx.values()].find((s) => s.chapterId === o.chapterId)?.subjectId : undefined);
  const chapterId = o.chapterId ?? skillInfo?.chapterId ?? undefined;
  const skillIds = o.skillId ? [o.skillId] : o.chapterId ? skillsOfChapter(ctx, o.chapterId) : undefined;
  let plan: PlanItem[] = []; let baseline: any = null; let ref: string | null = null; let notice: string | null = null; let total = 0;
  const mode = o.mode;

  if (mode === 'daily') {
    if (!subjectId) throw err('Choose a subject for the daily challenge.');
    ref = `${day}:${subjectId}`;
    const { data: existing } = await service.from('challenge_attempts').select('*').eq('student_id', studentId).eq('mode', 'daily').eq('ref', ref).maybeSingle();
    if (existing) return existing.status === 'completed' ? { attemptId: existing.id, question: null, completed: true, notice: 'You have already done today\'s challenge for this subject.' } : { attemptId: existing.id, question: await serveQuestion(service, existing, existing.cursor), completed: false, notice: null };
    const pool = await loadPool(service, ctx, { subjectId, verifiedOnly: true });
    const q = pickDaily(pool, day, subjectId, await allAnsweredIds(service, studentId));
    if (!q) throw err('No verified question is available for this subject yet.');
    plan = toPlan([q]); total = 1;
  } else if (mode === 'weakness') {
    if (!o.skillId) throw err('Choose a skill to battle.');
    const pool = await loadPool(service, ctx, { skillIds: [o.skillId] });
    if (pool.length < 5) throw err('This skill does not have enough questions yet for a battle.');
    const d0 = startDifficulty(mastery.get(o.skillId) ?? null);
    const first = [...pool].filter((q) => !seen.has(q.id)).sort((a, b) => Math.abs(a.difficulty - d0) - Math.abs(b.difficulty - d0))[0] ?? pool[0];
    plan = toPlan([first]); total = Math.min(MODE_SIZE.weakness, pool.length);
  } else if (mode === 'boss') {
    const pool = await loadPool(service, ctx, skillIds ? { skillIds, verifiedOnly: true } : { subjectId, verifiedOnly: true });
    const picked = composeBoss(pool.filter((q) => !seen.has(q.id)).length >= 10 ? pool.filter((q) => !seen.has(q.id)) : pool);
    if (picked.length < 10) throw err('There are not enough verified questions for a full Boss Battle in this area yet.');
    plan = toPlan(picked); total = plan.length;
  } else if (mode === 'mistake_review' || mode === 'comeback') {
    let rows: any[] = [];
    if (mode === 'comeback') {
      if (!o.sourceAttemptId) throw err('Choose the round to come back from.');
      const { data: src } = await service.from('challenge_attempts').select('*').eq('id', o.sourceAttemptId).eq('student_id', studentId).maybeSingle();
      if (!src || src.status !== 'completed') throw err('That round was not found.');
      const wrongIds = (src.answers ?? []).filter((a: any) => !a.correct).map((a: any) => a.qid);
      if (wrongIds.length < 1) throw err('There were no mistakes in that round.');
      baseline = { attemptId: src.id, correct: src.correct, total: src.total, percent: src.total ? Math.round((src.correct / src.total) * 100) : 0, wrong: wrongIds.length };
      const { data } = await service.from('mistake_book').select('*').eq('student_id', studentId).in('question_id', wrongIds); rows = data ?? [];
    } else {
      let q = service.from('mistake_book').select('*').eq('student_id', studentId).neq('status', 'corrected').order('repetitions', { ascending: false }).order('last_seen_at', { ascending: true }).limit(40);
      if (o.category) q = q.eq('error_category', o.category); if (o.skillId) q = q.eq('skill_id', o.skillId); if (subjectId && !o.skillId) q = q.eq('subject_id', subjectId);
      const { data } = await q; rows = data ?? [];
    }
    if (!rows.length) throw err(mode === 'comeback' ? 'Those mistakes are not in your Mistake Book.' : 'No mistakes waiting for review. Nice.');
    rows = rows.slice(0, mode === 'comeback' ? 8 : 4);
    const hard = new Set<string>(rows.map((r) => r.question_id)); const avoid = new Set<string>(hard); for (const s of seen) avoid.add(s);
    const poolSkills = [...new Set(rows.map((r) => r.skill_id).filter(Boolean))] as string[];
    const pool = poolSkills.length ? await loadPool(service, ctx, { skillIds: poolSkills }) : [];
    for (const r of rows) {
      plan.push({ qid: r.question_id, table: r.question_table, role: 'retry', mistakeId: r.id, difficulty: 3, skillId: r.skill_id ?? '' });
      const sim = r.skill_id ? (similarTo(pool, r.skill_id, 3, avoid) ?? similarTo(pool, r.skill_id, 3, hard)) : null; // prefer unseen; otherwise any other question of the skill
      if (sim) { avoid.add(sim.id); hard.add(sim.id); plan.push({ qid: sim.id, table: 'diagnostic_questions', role: 'similar', difficulty: sim.difficulty, skillId: sim.skill_id }); }
    }
    total = plan.length;
  } else if (mode === 'org') {
    if (!o.orgChallengeId) throw err('Missing challenge.');
    const { data: ch } = await service.from('org_challenges').select('*').eq('id', o.orgChallengeId).maybeSingle();
    if (!ch || !ch.active || day < ch.starts_on || day > ch.ends_on) throw err('This challenge is not open right now.');
    const { data: done } = await service.from('challenge_attempts').select('id, status').eq('student_id', studentId).eq('org_challenge_id', ch.id).limit(1).maybeSingle();
    if (done) return done.status === 'completed' ? { attemptId: done.id, question: null, completed: true, notice: 'You have already finished this challenge.' } : { attemptId: done.id, question: await serveQuestion(service, (await service.from('challenge_attempts').select('*').eq('id', done.id).single()).data, 0), completed: false, notice: null };
    const pool = (await loadPool(service, ctx, { subjectId: ch.subject_id ?? undefined, verifiedOnly: true })).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (pool.length < ch.size) throw err('Not enough verified questions for this challenge yet.');
    // Same questions for every student: a seeded pick by challenge id.
    let h = 2166136261; for (const c of ch.id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const rng = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; };
    const picked = shuffle(pool, rng).slice(0, ch.size).sort((a, b) => a.difficulty - b.difficulty);
    plan = toPlan(picked); total = plan.length; o.subjectId = ch.subject_id ?? undefined;
  } else if (mode === 'friend') {
    if (!o.friendChallengeId) throw err('Missing challenge.');
    if (!featureOn(ctx.settings, studentId, 'friend_challenge')) throw err('Friend challenges are not switched on yet.');
    const { data: fc } = await service.from('friend_challenges').select('*').eq('id', o.friendChallengeId).maybeSingle();
    if (!fc || (fc.created_by_student !== studentId && fc.joined_by_student !== studentId)) throw err('This friend challenge was not found.');
    if (['cancelled', 'expired'].includes(fc.status) || (fc.status !== 'completed' && new Date(fc.expires_at).getTime() < Date.now())) throw err('This friend challenge has ended.');
    if (fc.status === 'open' && fc.created_by_student !== studentId) throw err('This friend challenge was not found.');
    ref = `fc:${fc.id}`;
    const { data: mineF } = await service.from('challenge_attempts').select('*').eq('student_id', studentId).eq('ref', ref).limit(1).maybeSingle();
    if (mineF) return mineF.status === 'completed' ? { attemptId: mineF.id, question: null, completed: true, notice: 'You have already played this one.' } : { attemptId: mineF.id, question: await serveQuestion(service, mineF, mineF.cursor), completed: false, notice: null };
    plan = (fc.plan ?? []) as PlanItem[]; total = plan.length; o.subjectId = fc.subject_id ?? undefined;
  } else {
    const pool = await loadPool(service, ctx, skillIds ? { skillIds } : { subjectId });
    if (!pool.length) throw err('No questions are available here yet.');
    const size = MODE_SIZE[mode];
    if (mode === 'practice') plan = toPlan(composePractice(pool, mastery, size, seen));
    else if (mode === 'challenge') { const r = composeChallenge(pool, mastery, size, seen); plan = toPlan(r.picked); if (!r.harderAvailable) notice = 'There are not many harder questions in this area yet, so this round mixes in your usual level.'; }
    else if (mode === 'mixed') { plan = toPlan(composeMixed(pool, size, seen)); if (new Set(plan.map((p) => p.skillId)).size < 3) notice = 'Only a few skills have questions here, so this mix is narrower than usual.'; }
    else throw err('Unknown mode.');
    total = plan.length;
  }
  if (!plan.length) throw err('Could not build a round right now.');
  const { data: row, error } = await service.from('challenge_attempts').insert({ student_id: studentId, mode, subject_id: o.subjectId ?? subjectId ?? null, skill_id: o.skillId ?? null, chapter_id: chapterId ?? null, org_challenge_id: o.orgChallengeId ?? null, ref, plan, total, baseline }).select('*').single();
  if (error || !row) throw err('Could not start the round.');
  return { attemptId: row.id, question: await serveQuestion(service, row, 0), completed: false, notice };
}

/** Next question of a Weakness Battle: steps up after two right in a row, down after a miss, never repeating one. */
async function nextWeaknessItem(service: SupabaseClient, attempt: any, history: AnswerRec[], ctx: EngineCtx): Promise<PlanItem | null> {
  const pool = await loadPool(service, ctx, { skillIds: [attempt.skill_id] });
  const used = new Set<string>((attempt.plan ?? []).map((p: PlanItem) => p.qid));
  const lastD = (attempt.plan ?? [])[history.length - 1]?.difficulty ?? 2;
  const target = nextBattleDifficulty(lastD, history);
  const c = pool.filter((q) => !used.has(q.id)).sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) || Math.random() - 0.5)[0];
  return c ? { qid: c.id, table: 'diagnostic_questions', role: 'normal', difficulty: c.difficulty, skillId: c.skill_id } : null;
}

export async function answerChallenge(service: SupabaseClient, studentId: string, attemptId: string, given: unknown, seconds: number | null, ctx: EngineCtx): Promise<AnswerResult> {
  const { data: attempt } = await service.from('challenge_attempts').select('*').eq('id', attemptId).eq('student_id', studentId).maybeSingle();
  if (!attempt) throw err('Round not found.');
  if (attempt.status !== 'in_progress') throw err('This round is already finished.');
  const item: PlanItem | undefined = attempt.plan[attempt.cursor]; if (!item) throw err('No question to answer.');
  const { data: q } = await service.from(item.table).select('id, skill_id, prompt, question_type, options, expected_answer, explanation').eq('id', item.qid).maybeSingle();
  if (!q) throw err('Question not found.');
  const secs = typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 && seconds < 3600 ? Math.round(seconds) : null;
  { const bad = validateAnswer(inputKindOf(q.question_type, q.expected_answer), extractString(given)); if (bad) throw err(bad); }
  const correct = gradeAnswer(q.expected_answer, given); const correctAnswer = extractString(q.expected_answer);
  const info = ctx.idx.get(q.skill_id ?? item.skillId);
  const ref = `ch:${attemptId}`;
  let category: string | null = null;

  if (item.role === 'retry' && item.mistakeId) {
    const r = await applyRetry(service, studentId, item.mistakeId, correct, ref); category = r.category;
    if (r.corrected) await logEngagementEvent(service, studentId, 'mistake_corrected', `${ref}:${item.qid}`, { repetitions: r.repetitions, category: r.category });
  } else if (!correct) {
    await recordMistake(service, studentId, { questionTable: item.table, questionId: item.qid, skillId: q.skill_id ?? item.skillId ?? null, subjectId: info?.subjectId ?? attempt.subject_id ?? null, chapterId: info?.chapterId ?? null, studentAnswer: extractString(given), correctAnswer, category: null, source: 'challenge', ref });
  }
  let explanation: string | null = q.explanation ?? null;
  if (!correct && !explanation && ctx.ai) { try { explanation = await ensureExplanation(service, ctx.ai, item.table, { id: q.id, prompt: q.prompt, questionType: q.question_type, options: q.options, expectedAnswer: q.expected_answer, explanation: q.explanation }); } catch { explanation = null; } }

  const rec: AnswerRec & { at: string; category?: string | null } = { qid: item.qid, correct, seconds: secs, role: item.role, difficulty: item.difficulty, at: new Date().toISOString(), category };
  const answers = [...(attempt.answers ?? []), rec];
  let plan = attempt.plan as PlanItem[]; const cursor = attempt.cursor + 1;
  if (attempt.mode === 'weakness' && answers.length < attempt.total) { const nx = await nextWeaknessItem(service, { ...attempt, plan }, answers, ctx); if (nx) plan = [...plan, nx]; else attempt.total = answers.length; }
  const finished = cursor >= plan.length || answers.length >= attempt.total;
  const nCorrect = answers.filter((a: any) => a.correct).length;
  await service.from('challenge_attempts').update({ plan, answers, cursor, correct: nCorrect, total: attempt.total }).eq('id', attemptId);
  if (!finished) {
    const next = await serveQuestion(service, { ...attempt, plan, total: attempt.mode === 'weakness' ? attempt.total : attempt.total }, cursor);
    return { correct, correctAnswer, explanation, done: false, next, summary: null };
  }
  const summary = await finishAttempt(service, studentId, { ...attempt, plan, answers, correct: nCorrect, cursor }, ctx);
  return { correct, correctAnswer, explanation, done: true, next: null, summary };
}

/** Closes a round: accuracy, XP (with every anti-farming rule), personal best, review flags and the summary shown to the student. */
export async function finishAttempt(service: SupabaseClient, studentId: string, attempt: any, ctx: EngineCtx): Promise<ChallengeSummary> {
  const mode = attempt.mode as ChallengeMode; const answers = attempt.answers as (AnswerRec & { category?: string | null })[];
  const attempted = answers.length, correct = answers.filter((a) => a.correct).length;
  const accuracy = attempted ? Math.round((correct / attempted) * 1000) / 10 : null;
  const rules = ctx.settings.xp;
  const recent = await recentQuestionIds(service, studentId, rules.recent_question_days, attempt.id);
  const remaining = Math.max(0, rules.daily_cap - (await challengeXpToday(service, studentId, ctx.now)));
  const xp = xpForChallenge(mode, answers, attempt.plan?.length ?? attempted, rules, { recentQids: recent, remainingDailyXp: remaining, completed: true });
  const xpOn = ctx.settings.features.xp;
  if (xpOn && xp.amount > 0) await awardXp(service, studentId, { amount: xp.amount, kind: 'challenge', ref: `ch:${attempt.id}`, note: mode });
  const flag = suspiciousPattern(answers, rules);
  if (flag) { try { await service.from('engagement_flags').insert({ student_id: studentId, kind: flag, detail: { attempt: attempt.id, mode, answers: attempted } }); } catch { /* best effort */ } }
  const corrected = answers.filter((a) => a.role === 'retry' && a.correct).length;

  let best: BestResult | null = null;
  const bestModes: ChallengeMode[] = ['practice', 'challenge', 'mixed', 'boss', 'weakness', 'org', 'friend', 'session_quiz'];
  if (ctx.settings.features.personal_best && bestModes.includes(mode) && attempted >= MIN_QUESTIONS_FOR_BEST && accuracy !== null && attempt.subject_id) {
    best = await recordBest(service, studentId, 'quiz_score', attempt.subject_id, Math.round(accuracy), ctx.settings);
  }
  let comeback: ChallengeSummary['comeback'] = null;
  if (mode === 'comeback' && attempt.baseline) {
    const b = attempt.baseline; const retries = answers.filter((a) => a.role === 'retry');
    comeback = { original: { correct: b.correct, total: b.total, percent: b.percent }, now: { correct: retries.filter((a) => a.correct).length, total: retries.length, percent: retries.length ? Math.round((retries.filter((a) => a.correct).length / retries.length) * 100) : 0 }, corrected };
  }
  let conceptNote: string | null = null;
  if (mode === 'weakness' && attempted >= 6) {
    const f = answers.slice(0, 3), l = answers.slice(-3); const pf = Math.round((f.filter((a) => a.correct).length / f.length) * 100), pl = Math.round((l.filter((a) => a.correct).length / l.length) * 100);
    const top = Math.max(...answers.map((a) => a.difficulty ?? 1));
    conceptNote = `First 3 answers: ${pf}% correct. Last 3 answers: ${pl}% correct. Hardest level reached: ${top} of 5.`;
  }
  const info = attempt.skill_id ? ctx.idx.get(attempt.skill_id) : undefined;
  let nextAction = { text: 'Come back tomorrow for another round.', href: '/today' };
  const wrong = attempted - correct;
  if (mode === 'weakness' && accuracy !== null) nextAction = accuracy < 50 ? { text: `Open a lesson on ${info?.name ?? 'this skill'} to build it up.`, href: '/learn' } : accuracy >= 75 ? { text: 'Try a Challenge round in this subject.', href: `/challenge/start?mode=challenge&subject=${attempt.subject_id ?? ''}` } : { text: `Tomorrow: continue the ${info?.name ?? 'skill'} Weakness Battle.`, href: `/battle?skill=${attempt.skill_id ?? ''}` };
  else if (mode === 'friend') nextAction = { text: 'See your friend challenge.', href: '/friend' };
  else if (wrong >= 3 && mode !== 'comeback' && mode !== 'mistake_review') nextAction = { text: `Take the Comeback Challenge: fix the ${wrong} you missed.`, href: `/challenge/start?mode=comeback&source=${attempt.id}` };
  else if (mode === 'mistake_review' || mode === 'comeback') nextAction = { text: 'Keep going: your Mistake Book shows what is left.', href: '/mistakes' };
  const result = { attempted, correct, accuracy, xp: xp.amount, corrected, flagged: !!flag };
  const accRounded = accuracy;
  await service.from('challenge_attempts').update({ status: 'completed', completed_at: new Date().toISOString(), accuracy: accRounded, xp_awarded: xp.amount, correct, total: attempted, result }).eq('id', attempt.id);
  if (mode === 'friend') { try { await attachFriendAttempt(service, studentId, { id: attempt.id, ref: attempt.ref ?? null }); } catch { /* best effort */ } }
  await logEngagementEvent(service, studentId, 'challenge_completed', attempt.id, { mode, attempted, correct });
  try { await afterActivity(service, studentId, ctx); } catch { /* best effort */ }
  return { mode, attempted, correct, accuracy, xp: { amount: xp.amount, breakdown: xp.breakdown, capped: xp.capped }, best, mistakesCorrected: corrected, conceptNote, nextAction, comeback, masteryNote: MASTERY_NOTE };
}

/** A post-session quiz is graded elsewhere; this stores its outcome so it counts for streaks, XP, mistakes and personal bests. Best effort: it must never block the quiz. */
export async function recordQuizRound(service: SupabaseClient, studentId: string, o: { skillId?: string | null; review: { questionId: string; isCorrect: boolean; yourAnswer: string; correctAnswer: string }[] }, ctx: EngineCtx): Promise<void> {
  if (!o.review.length) return;
  const info = o.skillId ? ctx.idx.get(o.skillId) : undefined;
  const answers = o.review.map((r) => ({ qid: r.questionId, correct: r.isCorrect, seconds: null, role: 'normal' as const, difficulty: 3, at: new Date().toISOString() }));
  const { data: row } = await service.from('challenge_attempts').insert({ student_id: studentId, mode: 'session_quiz', subject_id: info?.subjectId ?? null, skill_id: o.skillId ?? null, chapter_id: info?.chapterId ?? null, plan: o.review.map((r) => ({ qid: r.questionId, table: 'diagnostic_questions', role: 'normal', difficulty: 3, skillId: o.skillId ?? '' })), cursor: o.review.length, answers, total: o.review.length, correct: answers.filter((a) => a.correct).length }).select('*').single();
  if (!row) return;
  for (const r of o.review) if (!r.isCorrect) await recordMistake(service, studentId, { questionTable: 'diagnostic_questions', questionId: r.questionId, skillId: o.skillId ?? null, subjectId: info?.subjectId ?? null, chapterId: info?.chapterId ?? null, studentAnswer: r.yourAnswer, correctAnswer: r.correctAnswer, category: null, source: 'quiz', ref: `ch:${row.id}` });
  await finishAttempt(service, studentId, row, ctx);
}
