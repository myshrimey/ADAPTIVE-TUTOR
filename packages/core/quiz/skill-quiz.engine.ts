import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { createDefaultAIProvider } from '../ai-provider/factory';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { logEvent } from '../analytics/events';
import { ensureExplanation } from '../explanations/ensure-explanation';

// A short, auto-generated quiz shown right after a learning session ends,
// covering the skill that session just taught. It deliberately reuses the
// existing diagnostic_questions bank (same question content that already
// has mixed types — mcq/numeric/short_answer — and difficulties for every
// skill) rather than inventing a new question source: that bank is large
// (900-1100+ questions per subject), so a same-skill, mixed-type,
// varied-difficulty sample is just a filtered, shuffled read, and nothing
// for the student to have already seen as a "diagnostic" question (this is
// a different context, a quiz, not a test). Most of that bank predates the
// `explanation` field, though — see ensure-explanation.ts for how a missed
// question always gets one anyway.

const QUIZ_LENGTH = 5;

export interface QuizQuestionView {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  difficulty: number;
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
 */
export async function generateSkillQuiz(supabase: SupabaseClient, skillId: string): Promise<QuizQuestionView[]> {
  const { data, error } = await supabase
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, difficulty')
    .eq('skill_id', skillId);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const shuffled = [...data].sort(() => Math.random() - 0.5);

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
  }));
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
    .select('id, prompt, question_type, options, expected_answer, explanation')
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
