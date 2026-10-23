import { inputKindOf, type InputKind } from '../answers/input';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { createDefaultAIProvider } from '../ai-provider/factory';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { logEvent } from '../analytics/events';
import { ensureExplanation } from '../explanations/ensure-explanation';
import { generateQuestionWithSolution, validateGeneratedQuestion } from '../question-engine/ai-question-generator';

// A short quiz shown right after a learning session ends, covering the
// skill that session just taught. Prefers the existing diagnostic_questions
// bank (mixed types — mcq/numeric/short_answer — and difficulties already
// authored for every skill) — a same-skill, mixed-type, varied-difficulty
// sample is just a filtered, shuffled read, and this is a different
// context from the diagnostic test, so there's no concern about a student
// having "already seen" one of these as a diagnostic question. When a
// skill's bank is too thin to fill a 5-question quiz, the rest are
// generated fresh via AI (see generateQuizTopUp below) and saved back into
// the bank, so repeated use is what grows a thin skill toward real depth.
// Some of the bank predates the `explanation` field — see
// ensure-explanation.ts for how a missed question without one always gets
// one anyway.

const QUIZ_LENGTH = 5;

export interface QuizQuestionView {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  difficulty: number;
  figureUrl: string | null;
  figureCaption: string | null;
  inputKind?: InputKind;
}

export interface QuizAnswerInput {
  questionId: string;
  answer: unknown;
}

export interface QuizReviewEntry {
  questionId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
}

export interface QuizResult {
  score: number; // correct count
  total: number;
  review: QuizReviewEntry[];
}

/**
 * Picks up to QUIZ_LENGTH questions for a skill, preferring a spread of
 * question types (one mcq, one numeric, one short_answer, etc.) over
 * picking the same type five times, then rounds out from whatever's left.
 * Never sends expected_answer/explanation to the client here — those are
 * only revealed after grading, same pattern as the diagnostic.
 *
 * When the bank has fewer than QUIZ_LENGTH questions for this skill, the gap
 * is filled with AI-generated ones (same generator used for learning-session
 * practice — see ai-question-generator.ts) rather than handing back a
 * shorter quiz. Each generated question is persisted into
 * diagnostic_questions (source: 'generated') before being served, so it's
 * immediately a real bank question too — this is what lets a thin skill's
 * bank grow toward real depth through ordinary use instead of needing
 * thousands of questions hand-authored up front for every skill.
 */
export async function generateSkillQuiz(
  supabase: SupabaseClient,
  skillId: string,
  aiProvider: AIProvider = createDefaultAIProvider()
): Promise<QuizQuestionView[]> {
  const { data, error } = await supabase
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, difficulty, figure_url, figure_caption, expected_answer')
    .eq('skill_id', skillId)
    .neq('content_status', 'rejected');
  if (error) throw error;

  let bank = data ?? [];
  if (bank.length < QUIZ_LENGTH) {
    const topUp = await generateQuizTopUp(supabase, aiProvider, skillId, QUIZ_LENGTH - bank.length, bank.map((q) => q.prompt));
    bank = [...bank, ...topUp];
  }
  if (bank.length === 0) return [];

  const shuffled = [...bank].sort(() => Math.random() - 0.5);

  const byType = new Map<string, typeof shuffled>();
  for (const q of shuffled) {
    if (!byType.has(q.question_type)) byType.set(q.question_type, []);
    byType.get(q.question_type)!.push(q);
  }

  const picked: typeof shuffled = [];
  const types = [...byType.keys()];
  let typeIdx = 0;
  while (picked.length < QUIZ_LENGTH && picked.length < shuffled.length) {
    const type = types[typeIdx % types.length];
    const pool = byType.get(type)!;
    if (pool.length > 0) picked.push(pool.shift()!);
    typeIdx++;
    if (types.every((t) => (byType.get(t)?.length ?? 0) === 0)) break;
  }

  return picked.slice(0, QUIZ_LENGTH).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    questionType: q.question_type,
    options: q.options,
    difficulty: q.difficulty,
    figureUrl: q.figure_url ?? null,
    figureCaption: q.figure_caption ?? null,
    inputKind: inputKindOf(q.question_type, q.expected_answer),
  }));
}

/**
 * Generates `count` fresh questions for a skill whose bank is too thin, and
 * persists each one into diagnostic_questions (source: 'generated') before
 * returning it — same shape pickFromBank below would have given back, so the
 * caller doesn't need to know which questions came from where. Best-effort:
 * if the skill/subject lookup fails or the AI is unavailable, logs and
 * returns whatever it managed (possibly nothing) rather than failing the
 * whole quiz over a handful of missing questions.
 */
async function generateQuizTopUp(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  skillId: string,
  count: number,
  avoidPrompts: string[]
): Promise<Array<{ id: string; prompt: string; question_type: string; options: unknown; difficulty: number; figure_url: string | null; figure_caption: string | null; expected_answer: unknown }>> {
  const { data: skillRow } = await supabase
    .from('skills')
    .select('id, name, topics(chapters(subjects(id, name)))')
    .eq('id', skillId)
    .single();
  const skillName: string = skillRow?.name ?? 'this skill';
  const subjectId: string | undefined = (skillRow as any)?.topics?.chapters?.subjects?.id;
  const subjectName: string = (skillRow as any)?.topics?.chapters?.subjects?.name ?? 'Mathematics';

  let diagnosticTestId: string | undefined;
  if (subjectId) {
    const { data: test } = await supabase.from('diagnostic_tests').select('id').eq('subject_id', subjectId).eq('is_active', true).limit(1).maybeSingle();
    diagnosticTestId = test?.id;
  }
  if (!diagnosticTestId) {
    console.error('generateQuizTopUp: no active diagnostic test found for skill', skillId, '— skipping AI top-up');
    return [];
  }

  const results: Array<{ id: string; prompt: string; question_type: string; options: unknown; difficulty: number; figure_url: string | null; figure_caption: string | null; expected_answer: unknown }> = [];
  const usedPrompts = [...avoidPrompts];
  // Sequential (not Promise.all), same reasoning as gradeSkillQuiz below —
  // keeps this from firing several AI calls at once for one small quiz.
  for (let i = 0; i < count; i++) {
    try {
      // Maths (Basic) is capped at difficulty 3 (direct, single-concept items).
      const difficulty = Math.min([2, 3, 3, 4, 2][i % 5], /\(Basic\)/i.test(subjectName) ? 3 : 5);
      const generated = await generateQuestionWithSolution(aiProvider, {
        subjectName,
        skillName,
        difficulty,
        avoidPrompts: usedPrompts,
      });
      const validation = validateGeneratedQuestion(generated);
      // diagnostic_questions (unlike questions) has no 'step' question type —
      // free-text reasoning questions belong to the learning-session flow,
      // which grades them via the AI evaluation prompt, not this quiz's
      // deterministic gradeAnswer(). Treat 'step' as invalid here rather than
      // let the insert fail on the table's CHECK constraint.
      if (validation.valid && generated.questionType === 'step') {
        console.error('generateQuizTopUp: generated a step-type question, not supported in diagnostic_questions — skipping', skillId);
        continue;
      }
      if (!validation.valid) {
        console.error('generateQuizTopUp: generated question failed validation', skillId, validation.reason);
        continue;
      }
      usedPrompts.push(generated.prompt);

      const { data: inserted, error } = await supabase
        .from('diagnostic_questions')
        .insert({
          diagnostic_test_id: diagnosticTestId,
          skill_id: skillId,
          difficulty,
          question_type: generated.questionType,
          prompt: generated.prompt,
          options: generated.options ?? null,
          expected_answer: generated.expectedAnswer,
          explanation: generated.explanation,
          source: 'generated',
          content_status: 'needs_review',
          validated: true,
        })
        .select('id, prompt, question_type, options, difficulty, figure_url, figure_caption, expected_answer')
        .single();
      if (error || !inserted) {
        console.error('generateQuizTopUp: failed to persist generated question', skillId, error);
        continue;
      }
      results.push(inserted);
    } catch (err) {
      console.error('generateQuizTopUp: generation failed', skillId, err);
    }
  }
  return results;
}

/**
 * Grades a completed quiz against the real expected_answer/explanation rows
 * (re-fetched here, never trusted from the client) and logs one analytics
 * event with the score. Doesn't touch mastery_states or question_attempts —
 * this quiz is a confidence check for the student right after a session, not
 * part of the mastery model, so it stays a side read/write of its own.
 */
export async function gradeSkillQuiz(
  supabase: SupabaseClient,
  studentId: string,
  sessionId: string | null,
  answers: QuizAnswerInput[],
  aiProvider: AIProvider = createDefaultAIProvider()
): Promise<QuizResult> {
  const questionIds = answers.map((a) => a.questionId);
  const { data, error } = await supabase
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, expected_answer, explanation, figure_url, figure_caption')
    .in('id', questionIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((q) => [q.id, q]));

  // Sequential, not Promise.all: a quiz is only 5 questions, and keeping it
  // sequential avoids firing several AI calls at once for one student's quiz
  // (easy to saturate a free-tier rate limit otherwise).
  const review: QuizReviewEntry[] = [];
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) {
      review.push({
        questionId: a.questionId,
        prompt: '',
        questionType: 'short_answer',
        yourAnswer: extractString(a.answer),
        correctAnswer: '',
        isCorrect: false,
        explanation: null,
        figureUrl: null,
        figureCaption: null,
      });
      continue;
    }
    const isCorrect = gradeAnswer(q.expected_answer, a.answer);
    const explanation = isCorrect
      ? q.explanation ?? null
      : await ensureExplanation(supabase, aiProvider, 'diagnostic_questions', {
          id: q.id,
          prompt: q.prompt,
          questionType: q.question_type,
          options: q.options,
          expectedAnswer: q.expected_answer,
          explanation: q.explanation,
        });
    review.push({
      questionId: q.id,
      prompt: q.prompt,
      questionType: q.question_type,
      yourAnswer: extractString(a.answer),
      correctAnswer: extractString(q.expected_answer),
      isCorrect,
      explanation,
      figureUrl: q.figure_url ?? null,
      figureCaption: q.figure_caption ?? null,
    });
  }

  const score = review.filter((r) => r.isCorrect).length;
  const result: QuizResult = { score, total: review.length, review };

  await logEvent({
    studentId,
    sessionId,
    eventType: 'post_session_quiz_completed',
    payload: { score, total: review.length },
  });

  return result;
}
