import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { generateQuestionWithSolution, validateGeneratedQuestion } from './ai-question-generator';

export interface QuestionSelectionParams {
  skillId: string;
  skillName: string;
  subjectName: string;
  masteryScore: number;
  difficulty: number; // 1-5
  learningObjective: string;
  recentMisconceptions: string[];
  recentQuestionIds: string[]; // avoid repeats
}

export interface SelectedQuestion {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric' | 'step';
  options?: unknown;
  expectedAnswer: unknown;
  difficulty: number;
  figureUrl: string | null;
  figureCaption: string | null;
}

/**
 * Prefers a bank question matching skill + difficulty that the student hasn't
 * seen recently; generates one via the AI provider only when the bank is thin
 * for that skill/difficulty (Cost Control, docs/architecture.md §13). Every
 * generated question is validated before being persisted and served.
 */
export async function selectQuestion(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  params: QuestionSelectionParams
): Promise<SelectedQuestion> {
  const bankQuestion = await pickFromBank(supabase, params);
  if (bankQuestion) return bankQuestion;

  // Bank is thin for this skill/difficulty — generate a fresh one via AI
  // instead of reusing a too-easy/too-hard or already-seen question
  // (docs/architecture.md §13, Cost Control). Every generated question is
  // persisted (source: 'generated') so it's immediately a real bank
  // question for every future student too — the bank genuinely grows
  // through use rather than needing every question hand-authored up front.
  const generated = await generateQuestionWithSolution(aiProvider, {
    subjectName: params.subjectName,
    skillName: params.skillName,
    difficulty: params.difficulty,
    learningObjective: params.learningObjective,
    recentMisconceptions: params.recentMisconceptions,
  });
  const validation = validateGeneratedQuestion(generated);
  if (!validation.valid) {
    throw new Error(`generated_question_invalid: ${validation.reason}`);
  }

  const { data: inserted, error } = await supabase
    .from('questions')
    .insert({
      skill_id: params.skillId,
      source: 'generated',
      content_status: 'needs_review',
      difficulty: params.difficulty,
      question_type: generated.questionType,
      prompt: generated.prompt,
      options: generated.options ?? null,
      expected_answer: generated.expectedAnswer,
      explanation: generated.explanation,
      validated: true,
    })
    .select()
    .single();
  if (error || !inserted) throw error ?? new Error('question_insert_failed');

  return {
    id: inserted.id,
    prompt: inserted.prompt,
    questionType: inserted.question_type,
    options: inserted.options,
    expectedAnswer: inserted.expected_answer,
    difficulty: inserted.difficulty,
    figureUrl: inserted.figure_url ?? null,
    figureCaption: inserted.figure_caption ?? null,
  };
}

async function pickFromBank(supabase: SupabaseClient, params: QuestionSelectionParams): Promise<SelectedQuestion | null> {
  let query = supabase
    .from('questions')
    .select('id, prompt, question_type, options, expected_answer, difficulty, figure_url, figure_caption')
    .eq('skill_id', params.skillId)
    .eq('validated', true)
    .neq('content_status', 'rejected')
    .gte('difficulty', Math.max(1, params.difficulty - 1))
    .lte('difficulty', Math.min(5, params.difficulty + 1));

  if (params.recentQuestionIds.length > 0) {
    query = query.not('id', 'in', `(${params.recentQuestionIds.join(',')})`);
  }

  const { data } = await query.limit(5);
  if (!data || data.length === 0) return null;

  const closest = [...data].sort((a, b) => Math.abs(a.difficulty - params.difficulty) - Math.abs(b.difficulty - params.difficulty))[0];
  return {
    id: closest.id,
    prompt: closest.prompt,
    questionType: closest.question_type,
    options: closest.options,
    expectedAnswer: closest.expected_answer,
    difficulty: closest.difficulty,
    figureUrl: closest.figure_url ?? null,
    figureCaption: closest.figure_caption ?? null,
  };
}

// The actual AI-generation call and its shape validation now live in
// ai-question-generator.ts (shared with quiz/skill-quiz.engine.ts) —
// re-exported here under their old names so nothing importing from this
// module (the barrel export in index.ts, any existing caller) breaks.
export { validateGeneratedQuestion as validateQuestionShape } from './ai-question-generator';

/** Re-checks a bank or already-inserted question's shape. */
export async function validateQuestion(question: SelectedQuestion): Promise<{ valid: boolean; reason?: string }> {
  return validateGeneratedQuestion({
    prompt: question.prompt,
    questionType: question.questionType,
    options: question.options as string[] | undefined,
    expectedAnswer: question.expectedAnswer as { value: string },
    explanation: 'placeholder', // SelectedQuestion doesn't carry explanation; shape-check skips this field for bank re-checks
  });
}
