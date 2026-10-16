import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { createDefaultAIProvider } from '../ai-provider/factory';
import { logEvent } from '../analytics/events';
import { computeMasteryScore, bandForScore, RETENTION_DEFAULT_SCORE } from '../mastery/types';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { ensureExplanation } from '../explanations/ensure-explanation';
import { generateQuestionWithSolution, validateGeneratedQuestion } from '../question-engine/ai-question-generator';

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
}

const MAX_QUESTIONS = 15;
const PREFERRED_DIFFICULTY = 3;

/**
 * Builds the anchor question plan — one diagnostic question per topic, walked
 * in curriculum order (docs/architecture.md §4: ~8-15 questions) — and creates
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
): Promise<{ attemptId: string; firstQuestion: DiagnosticQuestionView; resumed: boolean; answeredCount: number }> {
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
      return { attemptId: existingAttempt.id, firstQuestion, resumed: true, answeredCount: state.answers.length };
    }
  }

  const anchorSkillIds = await getAnchorSkillIds(supabase, subjectId);

  const plan: string[] = [];
  for (const skillId of anchorSkillIds) {
    const q = await pickOrGenerateQuestionForSkill(supabase, aiProvider, test.id, subjectId, skillId);
    if (q) plan.push(q.id);
    if (plan.length >= MAX_QUESTIONS) break;
  }
  if (plan.length === 0) throw new Error('no_diagnostic_questions_available');

  const state: DiagnosticPlanState = { plan, answers: [], insertedForSkill: {}, review: [] };

  const { data: attempt, error: attemptErr } = await supabase
    .from('diagnostic_attempts')
    .insert({ student_id: studentId, diagnostic_test_id: test.id, status: 'in_progress', result: state })
    .select()
    .single();
  if (attemptErr || !attempt) throw attemptErr ?? new Error('attempt_create_failed');

  await logEvent({ studentId, eventType: 'diagnostic_started', payload: { attemptId: attempt.id } });

  const firstQuestion = await loadQuestionView(supabase, plan[0]);
  return { attemptId: attempt.id, firstQuestion, resumed: false, answeredCount: 0 };
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
  | { nextQuestion: DiagnosticQuestionView; isCorrect: boolean; correctAnswer: string }
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

  if (!isCorrect && !state.insertedForSkill[question.skill_id] && state.plan.length < MAX_QUESTIONS) {
    const prereqQuestion = await pickPrerequisiteCheckQuestion(supabase, aiProvider, attempt.diagnostic_test_id, question.skill_id, state.plan);
    if (prereqQuestion) {
      const currentIndex = state.plan.indexOf(question.id);
      state.plan.splice(currentIndex + 1, 0, prereqQuestion.id);
      state.insertedForSkill[question.skill_id] = true;
    }
  }

  const currentIndex = state.plan.indexOf(question.id);
  const nextQuestionId = state.plan[currentIndex + 1];

  if (nextQuestionId) {
    await supabase.from('diagnostic_attempts').update({ result: state }).eq('id', attempt.id);
    const nextQuestion = await loadQuestionView(supabase, nextQuestionId);
    return { nextQuestion, isCorrect, correctAnswer };
  }

  const result = await finalizeDiagnostic(supabase, attempt.id, attempt.student_id, state);
  return { completed: true, result };
}

/**
 * One anchor question per CHAPTER (the first skill of the chapter's first
 * topic), not per topic. This was a deliberate change from the original
 * 4-chapter pilot, which anchored one question per topic — that scaled fine
 * at 12 topics but would blow well past the "~8-15 questions" target
 * (docs/architecture.md §4) as more chapters and subjects get added, since
 * topic count grows faster than chapter count. Chapter-level anchoring keeps
 * the diagnostic's length roughly proportional to how many chapters exist,
 * which is what stays true as content scales — topic-level granularity
 * within a chapter still gets assessed properly during real tutoring
 * sessions via the question bank, just not during the initial triage.
 */
async function getAnchorSkillIds(supabase: SupabaseClient, subjectId: string): Promise<string[]> {
  const { data: chapters, error: chErr } = await supabase
    .from('chapters')
    .select('id, sequence, topics(id, sequence, skills(id))')
    .eq('subject_id', subjectId);
  if (chErr) throw chErr;

  const anchors: string[] = [];
  const sortedChapters = [...(chapters ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  for (const chapter of sortedChapters as any[]) {
    const topics = [...(chapter.topics ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
    const firstTopic = topics[0];
    const firstSkill = firstTopic?.skills?.[0];
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
async function pickQuestionForSkill(supabase: SupabaseClient, testId: string, skillId: string) {
  const { data } = await supabase
    .from('diagnostic_questions')
    .select('id, difficulty')
    .eq('diagnostic_test_id', testId)
    .eq('skill_id', skillId)
    .neq('content_status', 'rejected');
  if (!data || data.length === 0) return null;

  const exact = data.filter((q) => q.difficulty === PREFERRED_DIFFICULTY);
  const pool = exact.length > 0 ? exact : data;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function pickPrerequisiteCheckQuestion(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  testId: string,
  skillId: string,
  existingPlan: string[]
) {
  const { data: prereqs } = await supabase.from('prerequisites').select('requires_skill_id').eq('skill_id', skillId);
  for (const p of prereqs ?? []) {
    const q = await pickOrGenerateQuestionForSkill(supabase, aiProvider, testId, null, p.requires_skill_id);
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
  skillId: string
) {
  const bankQuestion = await pickQuestionForSkill(supabase, testId, skillId);
  if (bankQuestion) return bankQuestion;

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
    const generated = await generateQuestionWithSolution(aiProvider, { subjectName, skillName, difficulty: PREFERRED_DIFFICULTY });
    const validation = validateGeneratedQuestion(generated);
    // diagnostic_questions has no 'step' type (see quiz/skill-quiz.engine.ts's
    // generateQuizTopUp for the same constraint) — treat it as invalid here.
    if (!validation.valid || generated.questionType === 'step') {
      console.error('pickOrGenerateQuestionForSkill: generated question unusable', skillId, validation.reason ?? 'step_type_not_supported');
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
    .select('id, skill_id, prompt, question_type, options, difficulty, figure_url, figure_caption')
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
