import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { buildExplanationPrompt } from '../prompts/explanation.prompt';

// Shown only if generation genuinely fails (every AI provider down) — a
// student should never see a bare "no explanation available" after getting
// something wrong.
const FALLBACK_EXPLANATION =
  "Compare your working against the correct answer above, step by step: check which formula you used, how you substituted the numbers, and your arithmetic, in that order — that's usually where the difference turns up.";

/**
 * Returns a question's explanation, generating and saving one on the spot
 * if it doesn't have one yet. Only called for a question the student just
 * got WRONG (see diagnostic/engine.ts and quiz/skill-quiz.engine.ts) — a
 * correct answer doesn't need one, which keeps this from calling the AI on
 * every single answer. The first student to miss a given question pays a
 * small generation delay; every student after that (on that same question)
 * gets it back instantly from the database.
 */
export async function ensureExplanation(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  table: 'diagnostic_questions' | 'questions',
  question: {
    id: string;
    prompt: string;
    questionType: string;
    options?: unknown;
    expectedAnswer: unknown;
    explanation?: string | null;
  }
): Promise<string> {
  if (question.explanation) return question.explanation;

  try {
    const built = buildExplanationPrompt({
      prompt: question.prompt,
      questionType: question.questionType,
      options: question.options,
      expectedAnswer: question.expectedAnswer,
    });
    const completion = await aiProvider.complete({ systemPrompt: built.system, userMessage: built.user });
    const text = completion.text?.trim();
    if (!text) return FALLBACK_EXPLANATION;

    // Best-effort write-through cache — never let a failed save stop the
    // student from seeing the explanation they're waiting on right now.
    try {
      await supabase.from(table).update({ explanation: text }).eq('id', question.id);
    } catch (err) {
      console.error('ensureExplanation: failed to save generated explanation', question.id, err);
    }

    return text;
  } catch (err) {
    console.error('ensureExplanation: generation failed', question.id, err);
    return FALLBACK_EXPLANATION;
  }
}
