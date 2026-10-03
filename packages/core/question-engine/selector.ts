import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';

export interface QuestionSelectionParams {
  skillId: string;
  skillName: string;
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

  const generated = await generateQuestion(aiProvider, params);
  const validation = validateQuestionShape(generated);
  if (!validation.valid) {
    throw new Error(`generated_question_invalid: ${validation.reason}`);
  }

  const { data: inserted, error } = await supabase
    .from('questions')
    .insert({
      skill_id: params.skillId,
      source: 'generated',
      difficulty: params.difficulty,
      question_type: generated.questionType,
      prompt: generated.prompt,
      options: generated.options ?? null,
      expected_answer: generated.expectedAnswer,
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
  };
}

async function pickFromBank(supabase: SupabaseClient, params: QuestionSelectionParams): Promise<SelectedQuestion | null> {
  let query = supabase
    .from('questions')
    .select('id, prompt, question_type, options, expected_answer, difficulty')
    .eq('skill_id', params.skillId)
    .eq('validated', true)
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
  };
}

interface GeneratedQuestion {
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric' | 'step';
  options?: string[];
  expectedAnswer: { value: string };
}

const GENERATION_SYSTEM_PROMPT = `You write a single CBSE Class 10 Maths practice question. Respond ONLY with JSON,
no prose, no markdown fences: {"prompt": string, "questionType": "mcq"|"short_answer"|"numeric"|"step",
"options": string[]|null, "expectedAnswer": {"value": string}}. The question must test exactly the named
skill at the named difficulty, use age-appropriate language, and have one unambiguous correct answer.`;

async function generateQuestion(aiProvider: AIProvider, params: QuestionSelectionParams): Promise<GeneratedQuestion> {
  const userMessage = [
    `Skill: ${params.skillName}`,
    `Learning objective: ${params.learningObjective}`,
    `Difficulty: ${params.difficulty}/5`,
    params.recentMisconceptions.length ? `Recent misconceptions to probe for: ${params.recentMisconceptions.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await aiProvider.complete({ systemPrompt: GENERATION_SYSTEM_PROMPT, userMessage, responseFormat: 'json' });

  try {
    return JSON.parse(result.text) as GeneratedQuestion;
  } catch {
    throw new Error('generated_question_not_valid_json');
  }
}

export function validateQuestionShape(q: GeneratedQuestion): { valid: boolean; reason?: string } {
  if (!q.prompt || q.prompt.trim().length < 5) return { valid: false, reason: 'prompt_too_short' };
  if (!['mcq', 'short_answer', 'numeric', 'step'].includes(q.questionType)) return { valid: false, reason: 'invalid_question_type' };
  if (q.questionType === 'mcq' && (!q.options || q.options.length < 2)) return { valid: false, reason: 'mcq_missing_options' };
  if (!q.expectedAnswer || !q.expectedAnswer.value) return { valid: false, reason: 'missing_expected_answer' };
  return { valid: true };
}

/** Re-checks a bank or already-inserted question's shape (used by eval/, Day 7). */
export async function validateQuestion(question: SelectedQuestion): Promise<{ valid: boolean; reason?: string }> {
  return validateQuestionShape({
    prompt: question.prompt,
    questionType: question.questionType,
    options: question.options as string[] | undefined,
    expectedAnswer: question.expectedAnswer as { value: string },
  });
}
