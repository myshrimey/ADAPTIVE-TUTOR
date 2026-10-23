import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { createDefaultAIProvider } from '../ai-provider/factory';
import { logEvent } from '../analytics/events';
import { computeMasteryScore, bandForScore, RETENTION_DEFAULT_SCORE } from '../mastery/types';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { inputKindOf, validateAnswer, type InputKind } from '../answers/input';
import { ensureExplanation } from '../explanations/ensure-explanation';
import { generateQuestionWithSolution, validateGeneratedQuestion, verifyGeneratedQuestion } from '../question-engine/ai-question-generator';

// Human-readable form of a stored/submitted answer for the diagnostic review
// screen — same extraction gradeAnswer() itself uses (a bare value, or
// `{ value: ... }`), just not reduced into grading tokens.
function extractAnswerDisplay(v: unknown): string {
  return extractString(v);
}

export interface DiagnosticQuestionView {
  id: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: unknown;
  difficulty: number;
  figureUrl: string | null;
  figureCaption: string | null;
  /** v60: what kind of answer the box accepts (never the answer itself). */
  inputKind?: InputKind;
}

export interface DiagnosticResult {
  attemptId: string;
  strengths: string[];
  weakSkills: string[];
  prerequisiteGaps: string[];
  possibleMisconceptions: Array<{ tag: string; skillId: string; confidence: number }>;
  recommendedStartingSkillId: string;
  // One entry per question actually asked, in the order it was answered —
  // the per-question "did I get this right, and what was the correct
  // answer/explanation" review the student sees after finishing (requested
  // directly: "tell the correct/incorrect answers along with explanations").
  questionReview: QuestionReviewEntry[];
}

export interface QuestionReviewEntry {
  questionId: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
}

interface DiagnosticPlanState {
  plan: string[]; // diagnostic_question ids, in order; adaptive insertions splice into this
  answers: Array<{ questionId: string; skillId: string; correct: boolean }>;
  insertedForSkill: Record<string, boolean>; // anchor skillId -> already inserted a prereq check for it
  review: QuestionReviewEntry[];
  /** v60: fixed length of this diagnostic. Attempts started before v60 have no target and keep their old plan (capped at 15). */
  target?: number;
  /** v60: ids of extra "filler" questions; on a miss the last unanswered filler makes room for the prerequisite check so the length stays fixed. */
  optional?: string[];
}

/** v60: every new diagnostic has exactly this many questions (founder choice, 2026-10-23). */
export const DIAGNOSTIC_LENGTH = 20;
const MAX_QUESTIONS = 15; // legacy attempts only
const PREFERRED_DIFFICULTY = 3;

/**
 * Builds the anchor question plan — one diagnostic question per topic, walked
 * in curriculum order (docs/architecture.md §4: a fixed 20 questions (v60)) — and creates
 * the diagnostic_attempts row. This plan is the "happy path" if every anchor is
 * answered correctly; a miss triggers an adaptive prerequisite-check insertion
 * in answerDiagnosticQuestion, not here.
 *
 * RESUME BEHAVIOR (added 2026-10-13, root-causing the "my diagnostic results
 * don't save" report): before this, every call here created a brand-new
 * `diagnostic_attempts` row, even if the student already had one sitting
 * `in_progress` for the same subject — e.g. they closed the tab partway
 * through and came back later. Nothing was ever actually lost (every
 * `completed` attempt's mastery_states rows checked out fine against live
 * data), but a student who never finishes an attempt never sees it reflected
 * in Progress either, which reads exactly like "my results didn't save." Now,
 * if an in-progress attempt already exists for this student+subject, we
 * resume it at the next unanswered question instead of silently abandoning
 * it and starting another one.
 */
export async function startDiagnostic(
  supabase: SupabaseClient,
  studentId: string,
  subjectId: string,
  aiProvider: AIProvider = createDefaultAIProvider()
): Promise<{ attemptId: string; firstQuestion: DiagnosticQuestionView; resumed: boolean; answeredCount: number; total: number }> {
  const { data: test, error: testErr } = await supabase
    .from('diagnostic_tests')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (testErr || !test) throw new Error('no_active_diagnostic_test');

  const { data: existingAttempt, error: existingErr } = await supabase
    .from('diagnostic_attempts')
    .select('id, result')
    .eq('student_id', studentId)
    .eq('diagnostic_test_id', test.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;

  if (existingAttempt) {
    const state = existingAttempt.result as DiagnosticPlanState;
    const nextIndex = state.answers.length;
    const nextQuestionId = state.plan[nextIndex];
    // The attempt's own plan is exhausted (shouldn't normally happen for a
    // row still marked in_progress — answerDiagnosticQuestion finalizes as
    // soon as the plan runs out) — fall through to starting a fresh attempt
    // rather than resuming into a dead end.
    if (nextQuestionId) {
      const firstQuestion = await loadQuestionView(supabase, nextQuestionId);
      return { attemptId: existingAttempt.id, firstQuestion, resumed: true, answeredCount: state.answers.length, total: state.target ?? state.plan.length };
    }
  }

  const slots = await getPlanSkillSlots(supabase, subjectId, DIAGNOSTIC_LENGTH);

  const plan: string[] = [];
  const optional: string[] = [];
  // Questions this student has already been asked in any earlier diagnostic: never served again while a fresh one can be found.
  const seen = await loadSeenQuestionOrder(supabase, studentId);
  for (const slot of slots) {
    const q = await pickOrGenerateQuestionForSkill(supabase, aiProvider, test.id, subjectId, slot.skillId, seen, plan);
    if (q && !plan.includes(q.id)) { plan.push(q.id); if (slot.filler) optional.push(q.id); }
    if (plan.length >= DIAGNOSTIC_LENGTH) break;
  }
  if (plan.length === 0) throw new Error('no_diagnostic_questions_available');

  const state: DiagnosticPlanState = { plan, answers: [], insertedForSkill: {}, review: [], target: DIAGNOSTIC_LENGTH, optional };

  const { data: attempt, error: attemptErr } = await supabase
    .from('diagnostic_attempts')
    .insert({ student_id: studentId, diagnostic_test_id: test.id, status: 'in_progress', result: state })
    .select()
    .single();
  if (attemptErr || !attempt) throw attemptErr ?? new Error('attempt_create_failed');

  await logEvent({ studentId, eventType: 'diagnostic_started', payload: { attemptId: attempt.id } });

  const firstQuestion = await loadQuestionView(supabase, plan[0]);
  return { attemptId: attempt.id, firstQuestion, resumed: false, answeredCount: 0, total: state.target ?? plan.length };
}

/**
 * Records the answer, adaptively inserts a prerequisite-check question when the
 * student misses one (once per anchor skill, capped by MAX_QUESTIONS), and
 * either returns the next question or — once the plan is exhausted — finalizes
 * the diagnostic result and seeds initial mastery_states from it.
 */
export async function answerDiagnosticQuestion(
  supabase: SupabaseClient,
  params: { attemptId: string; questionId: string; answer: unknown },
  aiProvider: AIProvider = createDefaultAIProvider()
): Promise<
  | { nextQuestion: DiagnosticQuestionView; isCorrect: boolean; correctAnswer: string; total: number }
  | { completed: true; result: DiagnosticResult }
> {
  const { data: attempt, error: attemptErr } = await supabase
    .from('diagnostic_attempts')
    .select('id, student_id, diagnostic_test_id, status, result')
    .eq('id', params.attemptId)
    .single();
  if (attemptErr || !attempt) throw attemptErr ?? new Error('attempt_not_found');
  if (attempt.status !== 'in_progress') throw new Error('attempt_not_in_progress');

  const { data: question, error: qErr } = await supabase
    .from('diagnostic_questions')
    .select('id, skill_id, prompt, question_type, options, expected_answer, explanation, figure_url, figure_caption')
    .eq('id', params.questionId)
    .single();
  if (qErr || !question) throw qErr ?? new Error('question_not_found');

  const formatProblem = validateAnswer(inputKindOf(question.question_type, question.expected_answer), extractString(params.answer));
  if (formatProblem) throw new Error('invalid_answer_format: ' + formatProblem);
  const isCorrect = gradeAnswer(question.expected_answer, params.answer);
  const correctAnswer = extractAnswerDisplay(question.expected_answer);

  await supabase.from('diagnostic_answers').insert({
    diagnostic_attempt_id: attempt.id,
    diagnostic_question_id: question.id,
    answer: params.answer,
    is_correct: isCorrect,
  });

  // A miss always gets an explanation — generated on the spot and saved back
  // onto the question if it didn't already have one authored (most of the
  // bank doesn't yet; see ensure-explanation.ts). A correct answer skips
  // this entirely, so getting something right never costs an AI call.
  const explanation = isCorrect
    ? question.explanation ?? null
    : await ensureExplanation(supabase, aiProvider, 'diagnostic_questions', {
        id: question.id,
        prompt: question.prompt,
        questionType: question.question_type,
        options: question.options,
        expectedAnswer: question.expected_answer,
        explanation: question.explanation,
      });

  const state = attempt.result as DiagnosticPlanState;
  if (!state.review) state.review = []; // attempts started before this field existed
  state.answers.push({ questionId: question.id, skillId: question.skill_id, correct: isCorrect });
  state.review.push({
    questionId: question.id,
    skillId: question.skill_id,
    prompt: question.prompt,
    questionType: question.question_type,
    yourAnswer: extractAnswerDisplay(params.answer),
    correctAnswer,
    isCorrect,
    explanation,
    figureUrl: question.figure_url ?? null,
    figureCaption: question.figure_caption ?? null,
  });

  const target = state.target ?? MAX_QUESTIONS;
  if (!isCorrect && !state.insertedForSkill[question.skill_id] && (state.plan.length < target || hasDroppableFiller(state))) {
    const prereqQuestion = await pickPrerequisiteCheckQuestion(supabase, aiProvider, attempt.diagnostic_test_id, question.skill_id, state.plan, await loadSeenQuestionOrder(supabase, attempt.student_id));
    if (prereqQuestion) {
      const currentIndex = state.plan.indexOf(question.id);
      state.plan.splice(currentIndex + 1, 0, prereqQuestion.id);
      state.insertedForSkill[question.skill_id] = true;
      // Fixed length: the prerequisite check takes the place of the last filler question that has not been asked yet.
      if (state.target && state.plan.length > state.target) dropLastFiller(state);
    }
  }

  const currentIndex = state.plan.indexOf(question.id);
  const nextQuestionId = state.plan[currentIndex + 1];

  if (nextQuestionId) {
    await supabase.from('diagnostic_attempts').update({ result: state }).eq('id', attempt.id);
    const nextQuestion = await loadQuestionView(supabase, nextQuestionId);
    return { nextQuestion, isCorrect, correctAnswer, total: state.target ?? state.plan.length };
  }

  const result = await finalizeDiagnostic(supabase, attempt.id, attempt.student_id, state);
  return { completed: true, result };
}

/**
 * One anchor question per CHAPTER (the first skill of the chapter's first
 * topic), not per topic. This was a deliberate change from the original
 * 4-chapter pilot, which anchored one question per topic — that scaled fine
 * at 12 topics but would blow well past the "a fixed 20 questions (v60)" target
 * (docs/architecture.md §4) as more chapters and subjects get added, since
 * topic count grows faster than chapter count. Chapter-level anchoring keeps
 * the diagnostic's length roughly proportional to how many chapters exist,
 * which is what stays true as content scales — topic-level granularity
 * within a chapter still gets assessed properly during real tutoring
 * sessions via the question bank, just not during the initial triage.
 */
export function hasDroppableFiller(state: DiagnosticPlanState): boolean {
  const answered = new Set(state.answers.map((a) => a.questionId));
  return (state.optional ?? []).some((id) => !answered.has(id) && state.plan.includes(id));
}
export function dropLastFiller(state: DiagnosticPlanState): void {
  const answered = new Set(state.answers.map((a) => a.questionId));
  const cand = [...state.plan].reverse().find((id) => (state.optional ?? []).includes(id) && !answered.has(id));
  if (!cand) return;
  state.plan.splice(state.plan.indexOf(cand), 1);
  state.optional = (state.optional ?? []).filter((x) => x !== cand);
}

export interface PlanSlot { skillId: string; filler: boolean }
/**
 * v60: exactly `length` question slots. One anchor per chapter in curriculum order (spread evenly when a subject has more chapters than
 * `length`); when there are fewer chapters, the rest are filler slots taken round-robin from the chapters' other skills (a different skill
 * of the same chapter first; a skill is repeated, with a different question, only when the subject has no more skills).
 */
export function buildPlanSlots(chapters: string[][], length: number): PlanSlot[] {
  const ch = chapters.filter((c) => c.length > 0);
  if (ch.length === 0) return [];
  if (ch.length >= length) {
    const out: PlanSlot[] = [];
    for (let i = 0; i < length; i++) out.push({ skillId: ch[Math.floor((i * ch.length) / length)][0], filler: false });
    return out;
  }
  const slots: PlanSlot[] = ch.map((c) => ({ skillId: c[0], filler: false }));
  const next = ch.map(() => 1);
  let guard = 0;
  while (slots.length < length && guard++ < length * ch.length + 50) {
    for (let i = 0; i < ch.length && slots.length < length; i++) {
      const list = ch[i];
      const idx = next[i]++;
      slots.push({ skillId: list[idx % list.length], filler: true });
    }
  }
  return slots;
}

async function getPlanSkillSlots(supabase: SupabaseClient, subjectId: string, length: number): Promise<PlanSlot[]> {
  const { data: chapters, error: chErr } = await supabase
    .from('chapters')
    .select('id, sequence, topics(id, sequence, skills(id, retired))')
    .eq('subject_id', subjectId);
  if (chErr) throw chErr;
  const sorted = [...(chapters ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  const lists: string[][] = sorted.map((chapter: any) => {
    const topics = [...(chapter.topics ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
    const out: string[] = [];
    for (const t of topics) for (const s of (t.skills ?? [])) if (!s.retired) out.push(s.id);
    return out;
  });
  return buildPlanSlots(lists, length);
}

async function getAnchorSkillIds(supabase: SupabaseClient, subjectId: string): Promise<string[]> {
  const { data: chapters, error: chErr } = await supabase
    .from('chapters')
    .select('id, sequence, topics(id, sequence, skills(id, retired))')
    .eq('subject_id', subjectId);
  if (chErr) throw chErr;

  const anchors: string[] = [];
  const sortedChapters = [...(chapters ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  for (const chapter of sortedChapters as any[]) {
    const topics = [...(chapter.topics ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
    const firstTopic = topics[0];
    // Retired skills (lessons CBSE removed from the exam) are never used as an anchor.
    const firstSkill = (firstTopic?.skills ?? []).find((s: any) => !s.retired);
    if (firstSkill) anchors.push(firstSkill.id);
  }
  return anchors;
}

// Picks a random question among whichever candidates best match
// PREFERRED_DIFFICULTY for this skill — not always the same one — so a
// student retaking the diagnostic (or a different student on the same
// skill) doesn't necessarily see an identical question every time. This is
// a zero-cost mechanism: it only has anything to vary once a skill has more
// than one authored question (see cbse-class10-*-diagnostic.json), which is
// still a work in progress across subjects; a skill with just one question
// simply always returns that one, same as before.
async function loadSeenQuestionOrder(supabase: SupabaseClient, studentId: string): Promise<Map<string, number>> {
  // question id -> when last answered (ms). Empty on any error so a database hiccup never blocks a diagnostic.
  const out = new Map<string, number>();
  try {
    const { data: attempts } = await supabase.from('diagnostic_attempts').select('id').eq('student_id', studentId);
    const ids = (attempts ?? []).map((a: any) => a.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabase.from('diagnostic_answers').select('diagnostic_question_id, responded_at').in('diagnostic_attempt_id', ids.slice(i, i + 100));
      for (const r of data ?? []) {
        const t = Date.parse((r as any).responded_at) || 0;
        const q = (r as any).diagnostic_question_id as string;
        if (t >= (out.get(q) ?? 0)) out.set(q, t);
      }
    }
  } catch { /* ignore */ }
  return out;
}

/** Random UNSEEN question for the skill (prefers the preferred difficulty). Returns the pool of all candidates too, for the fallback. */
async function pickQuestionForSkill(supabase: SupabaseClient, testId: string, skillId: string, seen: Map<string, number>, plan: string[]) {
  const { data } = await supabase
    .from('diagnostic_questions')
    .select('id, difficulty, prompt')
    .eq('diagnostic_test_id', testId)
    .eq('skill_id', skillId)
    .neq('content_status', 'rejected');
  const all = (data ?? []).filter((q: any) => !plan.includes(q.id));
  const unseen = all.filter((q: any) => !seen.has(q.id));
  const exact = unseen.filter((q: any) => q.difficulty === PREFERRED_DIFFICULTY);
  const pool = exact.length > 0 ? exact : unseen;
  const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  return { pick, all, seenPrompts: all.filter((q: any) => seen.has(q.id)).map((q: any) => String(q.prompt)) };
}

async function pickPrerequisiteCheckQuestion(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  testId: string,
  skillId: string,
  existingPlan: string[],
  seen: Map<string, number>
) {
  const { data: prereqs } = await supabase.from('prerequisites').select('requires_skill_id').eq('skill_id', skillId);
  for (const p of prereqs ?? []) {
    const q = await pickOrGenerateQuestionForSkill(supabase, aiProvider, testId, null, p.requires_skill_id, seen, existingPlan);
    // Skip if this prerequisite's question is already in the plan — its own
    // anchor slot already covers it, no need to test it twice.
    if (q && !existingPlan.includes(q.id)) return q;
  }
  return null;
}

/**
 * Picks a bank question for this skill (pickQuestionForSkill's existing
 * behavior); if the bank has none for this test+skill, generates one via AI
 * and persists it into diagnostic_questions (source: 'generated') before
 * returning it — same shared generator used for learning-session practice
 * and the post-session quiz (question-engine/ai-question-generator.ts).
 *
 * This is a safety net, not the normal path: anchor skills and their
 * prerequisites are expected to already have authored bank questions, and
 * in the common case this never touches the AI at all. It exists so a
 * newly added chapter/skill with no diagnostic question yet doesn't block a
 * student's diagnostic outright — deliberately NOT a way to replace the
 * diagnostic's curated bank with AI variety by default (see
 * docs/DECISIONS.md: the diagnostic intentionally favors a fixed, known,
 * consistent baseline over variety, unlike the quiz/practice flows).
 *
 * subjectId is optional and only fetched (via testId -> diagnostic_tests)
 * when actually falling back to generation, so the common bank-hit path
 * costs nothing extra.
 */
async function pickOrGenerateQuestionForSkill(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  testId: string,
  subjectId: string | null,
  skillId: string,
  seen: Map<string, number>,
  plan: string[]
) {
  const { pick, all, seenPrompts } = await pickQuestionForSkill(supabase, testId, skillId, seen, plan);
  if (pick) return pick;
  // Everything in the bank for this skill has been seen (or the bank is empty): make a new one; if that fails, reuse the
  // question this student saw LONGEST ago rather than leave the diagnostic without a question.
  const fresh = await generateFreshQuestion(supabase, aiProvider, testId, subjectId, skillId, seenPrompts);
  if (fresh) return fresh;
  if (all.length === 0) return null;
  return [...all].sort((x: any, y: any) => (seen.get(x.id) ?? 0) - (seen.get(y.id) ?? 0))[0];
}

async function generateFreshQuestion(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  testId: string,
  subjectId: string | null,
  skillId: string,
  avoidPrompts: string[]
) {
  // Up to 3 tries: the second AI check can reject a question; a student should not get a repeat just because of one rejection.
  for (let i = 0; i < 3; i++) {
    const q = await generateFreshQuestionOnce(supabase, aiProvider, testId, subjectId, skillId, avoidPrompts);
    if (q) return q;
  }
  return null;
}

async function generateFreshQuestionOnce(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  testId: string,
  subjectId: string | null,
  skillId: string,
  avoidPrompts: string[]
) {
  let resolvedSubjectId = subjectId;
  if (!resolvedSubjectId) {
    const { data: test } = await supabase.from('diagnostic_tests').select('subject_id').eq('id', testId).single();
    resolvedSubjectId = test?.subject_id ?? null;
  }
  const { data: skillRow } = await supabase.from('skills').select('name').eq('id', skillId).single();
  const { data: subjectRow } = resolvedSubjectId
    ? await supabase.from('subjects').select('name').eq('id', resolvedSubjectId).single()
    : { data: null };
  const skillName = skillRow?.name ?? 'this skill';
  const subjectName = subjectRow?.name ?? 'Mathematics';

  try {
    const generated = await generateQuestionWithSolution(aiProvider, { subjectName, skillName, difficulty: PREFERRED_DIFFICULTY, avoidPrompts: avoidPrompts.slice(-6) });
    const validation = validateGeneratedQuestion(generated);
    // diagnostic_questions has no 'step' type (see quiz/skill-quiz.engine.ts's
    // generateQuizTopUp for the same constraint) — treat it as invalid here.
    if (!validation.valid || generated.questionType === 'step') {
      console.error('pickOrGenerateQuestionForSkill: generated question unusable', skillId, validation.reason ?? 'step_type_not_supported');
      return null;
    }

    if (!(await verifyGeneratedQuestion(aiProvider, generated))) {
      console.error('generateFreshQuestion: second check disagreed, question dropped', skillId);
      return null;
    }
    const { data: inserted, error } = await supabase
      .from('diagnostic_questions')
      .insert({
        diagnostic_test_id: testId,
        skill_id: skillId,
        difficulty: PREFERRED_DIFFICULTY,
        question_type: generated.questionType,
        prompt: generated.prompt,
        options: generated.options ?? null,
        expected_answer: generated.expectedAnswer,
        explanation: generated.explanation,
        source: 'generated',
        content_status: 'needs_review',
        validated: true,
      })
      .select('id, difficulty')
      .single();
    if (error || !inserted) {
      console.error('pickOrGenerateQuestionForSkill: failed to persist generated question', skillId, error);
      return null;
    }
    return inserted;
  } catch (err) {
    console.error('pickOrGenerateQuestionForSkill: generation failed', skillId, err);
    return null;
  }
}

async function loadQuestionView(supabase: SupabaseClient, questionId: string): Promise<DiagnosticQuestionView> {
  const { data, error } = await supabase
    .from('diagnostic_questions')
    .select('id, skill_id, prompt, question_type, options, difficulty, figure_url, figure_caption, expected_answer')
    .eq('id', questionId)
    .single();
  if (error || !data) throw error ?? new Error('question_not_found');
  return {
    id: data.id,
    skillId: data.skill_id,
    prompt: data.prompt,
    questionType: data.question_type,
    options: data.options,
    difficulty: data.difficulty,
    figureUrl: data.figure_url ?? null,
    figureCaption: data.figure_caption ?? null,
    inputKind: inputKindOf(data.question_type, data.expected_answer),
  };
}

// (grading now shared via ../question-engine/grading.ts)

async function finalizeDiagnostic(
  supabase: SupabaseClient,
  attemptId: string,
  studentId: string,
  state: DiagnosticPlanState
): Promise<DiagnosticResult> {
  const strengths = [...new Set(state.answers.filter((a) => a.correct).map((a) => a.skillId))];
  const missedSkillIds = [...new Set(state.answers.filter((a) => !a.correct).map((a) => a.skillId))];

  // A missed skill counts as a prerequisite gap if something else that was
  // also missed depends on it — i.e. it looks like the root cause, not just
  // a symptom of the same underlying gap.
  const prerequisiteGaps: string[] = [];
  for (const skillId of missedSkillIds) {
    const { data: dependents } = await supabase.from('prerequisites').select('skill_id').eq('requires_skill_id', skillId);
    const dependentAlsoMissed = (dependents ?? []).some((d) => missedSkillIds.includes(d.skill_id));
    if (dependentAlsoMissed) prerequisiteGaps.push(skillId);
  }
  const weakSkills = missedSkillIds.filter((s) => !prerequisiteGaps.includes(s));

  const recommendedStartingSkillId = prerequisiteGaps[0] ?? weakSkills[0] ?? strengths[strengths.length - 1] ?? state.answers[0]?.skillId ?? '';

  const result: DiagnosticResult = {
    attemptId,
    strengths,
    weakSkills,
    prerequisiteGaps,
    possibleMisconceptions: [], // pattern-based detection is Day 5 (misconceptions/taxonomy.ts)
    recommendedStartingSkillId,
    questionReview: state.review ?? [],
  };

  await supabase.from('diagnostic_attempts').update({ status: 'completed', completed_at: new Date().toISOString(), result }).eq('id', attemptId);

  await seedMasteryFromDiagnostic(supabase, studentId, state.answers);

  await logEvent({ studentId, eventType: 'diagnostic_completed', payload: { attemptId } });

  return result;
}

/**
 * Seeds a coarse initial mastery_states row per skill the diagnostic touched
 * (correct -> ~developing, incorrect -> ~needs_foundation), so the learner
 * model has something to work with immediately. mastery.service.ts's
 * updateMastery() refines these as soon as real question_attempts exist —
 * these are deliberately not treated as authoritative history.
 */
async function seedMasteryFromDiagnostic(supabase: SupabaseClient, studentId: string, answers: DiagnosticPlanState['answers']): Promise<void> {
  const bySkill = new Map<string, boolean[]>();
  for (const a of answers) {
    if (!bySkill.has(a.skillId)) bySkill.set(a.skillId, []);
    bySkill.get(a.skillId)!.push(a.correct);
  }

  for (const [skillId, results] of bySkill) {
    const accuracy = (results.filter(Boolean).length / results.length) * 100;
    const components = {
      recentAccuracy: accuracy,
      applicationPerformance: accuracy,
      consistency: 100,
      independentPerformance: accuracy,
      retention: RETENTION_DEFAULT_SCORE,
    };
    const score = computeMasteryScore(components);
    await supabase.from('mastery_states').upsert(
      { student_id: studentId, skill_id: skillId, score, band: bandForScore(score), component_scores: components, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,skill_id' }
    );
  }
}
