import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import type { MisconceptionTag } from '../learner-model/types';

// Fixed taxonomy. Confidence-scored, never shown to the student as a label —
// only used internally to select a REMEDIATION strategy. See docs/architecture.md §9.
export const MISCONCEPTION_TAXONOMY: Record<MisconceptionTag, { description: string }> = {
  SIGN_ERROR: { description: 'Drops or flips a sign during a manipulation.' },
  ALGEBRAIC_MANIPULATION: { description: 'Error in rearranging/simplifying an algebraic expression.' },
  FORMULA_MISUSE: { description: 'Applies the wrong formula, or the right formula incorrectly.' },
  CONCEPT_CONFUSION: { description: 'Conflates two related concepts (e.g. factor vs. root).' },
  PROCEDURAL_ERROR: { description: 'Knows the concept but executes the steps out of order or incompletely.' },
  ARITHMETIC_ERROR: { description: 'Correct method, wrong basic arithmetic.' },
  PREREQUISITE_GAP: { description: 'Missing a foundational skill this skill depends on.' },
  INCOMPLETE_REASONING: { description: 'Reasoning stops short of a full justification/solution.' },
};

// Implemented as a real two-stage detector: deterministic pattern match first
// (numeric sign-flip check, catches the single most common algebra slip
// cheaply — docs/architecture.md §9), then an LLM-assisted fallback using the
// question's own misconception_tags as the candidate set, constrained to
// return one of the eight tags above plus a confidence. Never free-text
// psychological interpretation. Richer deterministic pattern matching
// (beyond sign-flip) is a natural place to extend this without touching its
// callers.
export async function detectMisconception(
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  params: { questionId: string; expectedAnswer: unknown; studentAnswer: unknown; isCorrect: boolean }
): Promise<{ tag: MisconceptionTag; confidence: number } | null> {
  if (params.isCorrect) return null;

  const { data: question } = await supabase
    .from('questions')
    .select('misconception_tags')
    .eq('id', params.questionId)
    .maybeSingle();
  const candidateTags: MisconceptionTag[] = (question?.misconception_tags as MisconceptionTag[] | undefined) ?? [];

  const signFlip = detectSignFlip(params.expectedAnswer, params.studentAnswer);
  if (signFlip) return { tag: 'SIGN_ERROR', confidence: 0.7 };

  const closeNumericMiss = detectCloseNumericMiss(params.expectedAnswer, params.studentAnswer);
  if (closeNumericMiss && candidateTags.includes('ARITHMETIC_ERROR')) {
    return { tag: 'ARITHMETIC_ERROR', confidence: 0.5 };
  }

  if (candidateTags.length === 0) return null; // nothing to narrow down to — leave unclassified rather than guess

  if (candidateTags.length === 1) return { tag: candidateTags[0], confidence: 0.4 };

  try {
    const result = await aiProvider.complete({
      systemPrompt: `Classify a Class 10 Maths student's incorrect answer into exactly one of these tags: ${candidateTags.join(', ')}.
Respond ONLY with JSON: {"tag": string, "confidence": number}. tag must be one of the given options.`,
      userMessage: `Expected: ${JSON.stringify(params.expectedAnswer)}\nStudent answered: ${JSON.stringify(params.studentAnswer)}`,
      responseFormat: 'json',
    });
    const parsed = JSON.parse(result.text) as { tag: MisconceptionTag; confidence: number };
    if (candidateTags.includes(parsed.tag)) return parsed;
  } catch {
    // Classification is a nice-to-have, not load-bearing — fall through to the coarse guess below.
  }

  return { tag: candidateTags[0], confidence: 0.3 };
}

/**
 * Upserts a detected misconception into the misconceptions table: bumps
 * confidence/last_seen_at if the student already has an unresolved one with
 * this tag on this skill, otherwise inserts a new row.
 */
export async function recordMisconception(
  supabase: SupabaseClient,
  studentId: string,
  skillId: string,
  tag: MisconceptionTag,
  confidence: number
): Promise<string> {
  const { data: existing } = await supabase
    .from('misconceptions')
    .select('id, confidence')
    .eq('student_id', studentId)
    .eq('skill_id', skillId)
    .eq('tag', tag)
    .eq('resolved', false)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('misconceptions')
      .update({ confidence: Math.max(existing.confidence, confidence), last_seen_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from('misconceptions')
    .insert({ student_id: studentId, skill_id: skillId, tag, confidence, resolved: false })
    .select()
    .single();
  if (error || !inserted) throw error ?? new Error('misconception_insert_failed');
  return inserted.id;
}

/** Cheap deterministic check: same magnitude, opposite sign — the single most common algebra slip. */
function detectSignFlip(expected: unknown, given: unknown): boolean {
  const expectedNum = extractNumber(expected);
  const givenNum = extractNumber(given);
  if (expectedNum === null || givenNum === null) return false;
  return expectedNum !== 0 && givenNum === -expectedNum;
}

/**
 * Cheap deterministic check: right ballpark, wrong exact value — suggests the
 * method was right but a basic calculation slipped (a multiplication table
 * error, an off-by-one in carrying, etc.), rather than a conceptual miss.
 * Deliberately conservative (small absolute or relative tolerance) so it
 * doesn't fire on answers that are just wrong in a different way. Note: like
 * detectSignFlip, this only looks at the first number in each string, so it's
 * a best-effort signal on multi-value answers (root lists), not a guarantee —
 * acceptable here since a miss just falls through to the LLM-assisted stage.
 */
function detectCloseNumericMiss(expected: unknown, given: unknown): boolean {
  const expectedNum = extractNumber(expected);
  const givenNum = extractNumber(given);
  if (expectedNum === null || givenNum === null || expectedNum === givenNum) return false;
  const diff = Math.abs(expectedNum - givenNum);
  const tolerance = Math.max(2, Math.abs(expectedNum) * 0.1);
  return diff <= tolerance;
}

function extractNumber(v: unknown): number | null {
  const str = typeof v === 'object' && v !== null && 'value' in (v as Record<string, unknown>) ? String((v as Record<string, unknown>).value) : String(v ?? '');
  const match = str.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}
