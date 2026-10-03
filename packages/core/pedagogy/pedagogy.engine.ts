import type { PedagogySignal, PedagogyStrategy } from './strategies';

/**
 * First matching rule wins. Order matters — see docs/architecture.md §10 for
 * the rationale behind each row (e.g. a prerequisite gap always overrides an
 * explicit student command, since teaching the current skill first would be
 * teaching on sand).
 */
export function selectStrategy(signal: PedagogySignal): PedagogyStrategy {
  if (signal.hasPrerequisiteGap) return 'PREREQUISITE_REPAIR';
  if (signal.consecutiveMissesSameMisconception >= 2) return 'REMEDIATION';
  if (signal.isFirstExposure) return 'EXPLAIN';

  switch (signal.studentCommand) {
    case 'dont_understand':
    case 'explain_differently':
      return 'SIMPLIFY';
    case 'hint':
      return 'HINT';
    case 'example':
      return 'EXAMPLE';
    case 'easier':
      return 'SIMPLIFY';
    case 'challenge':
      return 'CHALLENGE';
  }

  if (signal.sessionObjectiveReached) return 'INDEPENDENT_TEST';
  if (signal.masteredAndDueForReview) return 'REVIEW';
  if (signal.currentMasteryScore < 60) return 'GUIDED_PRACTICE';
  return 'SOCRATIC';
}

/**
 * Maps mastery score to a base difficulty (1-5), then nudges it by the
 * student's recent difficulty-response trend. Kept as a pure function so the
 * orchestrator can call it before AND after an explicit "easier"/"challenge"
 * override without duplicating the mapping logic.
 */
export function selectDifficulty(params: { masteryScore: number; trend: 'struggling' | 'comfortable' | 'ready_for_challenge' }): number {
  const base = Math.max(1, Math.min(5, Math.round(params.masteryScore / 20) + 1));
  if (params.trend === 'struggling') return Math.max(1, base - 1);
  if (params.trend === 'ready_for_challenge') return Math.min(5, base + 1);
  return base;
}

/**
 * Immediate within-session adaptation: a classic one-step-up-on-correct,
 * one-step-down-on-incorrect adjustment from the difficulty the student was
 * just given, blended with the mastery-band baseline from selectDifficulty()
 * so a single lucky/unlucky answer can't swing difficulty as far as a
 * genuine mastery trend can. Used right after grading an answer, when the
 * orchestrator poses the next question in the same turn rather than waiting
 * for the next full learner-state reload to pick a difficulty up.
 */
export function nextDifficulty(params: {
  previousDifficulty: number;
  isCorrect: boolean;
  masteryScore: number;
  trend: 'struggling' | 'comfortable' | 'ready_for_challenge';
}): number {
  const stepped = params.isCorrect ? Math.min(5, params.previousDifficulty + 1) : Math.max(1, params.previousDifficulty - 1);
  const baseline = selectDifficulty({ masteryScore: params.masteryScore, trend: params.trend });
  return Math.round((stepped + baseline) / 2);
}

/**
 * Lightweight keyword parser for the fixed set of student commands the tutor
 * must recognize (docs/architecture.md, System Prompt section). Checked before
 * falling through to treating the message as ordinary free-text — this is
 * intentionally simple pattern matching, not NLU; it only needs to catch the
 * documented phrasings and their obvious variants.
 */
export function parseStudentCommand(message: string): PedagogySignal['studentCommand'] {
  const m = message.toLowerCase();
  if (/don'?t understand|confused|lost/.test(m)) return 'dont_understand';
  if (/explain (it )?differently|explain again|another way/.test(m)) return 'explain_differently';
  if (/\bhint\b/.test(m)) return 'hint';
  if (/\bexample\b/.test(m)) return 'example';
  if (/easier|simpler|too hard/.test(m)) return 'easier';
  if (/challenge me|harder|more difficult/.test(m)) return 'challenge';
  return null;
}
