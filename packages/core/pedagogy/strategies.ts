export type PedagogyStrategy =
  | 'EXPLAIN'
  | 'EXAMPLE'
  | 'GUIDED_PRACTICE'
  | 'SOCRATIC'
  | 'HINT'
  | 'SIMPLIFY'
  | 'PREREQUISITE_REPAIR'
  | 'REMEDIATION'
  | 'CHALLENGE'
  | 'REVIEW'
  | 'INDEPENDENT_TEST'
  | 'SELF_EXPLANATION';

// Rule-based selection table (docs/architecture.md §10). The LLM executes the
// chosen strategy — it never chooses it. The rule engine itself lives in
// pedagogy.engine.ts; this file holds only the shared types.
export interface PedagogySignal {
  hasPrerequisiteGap: boolean;
  consecutiveMissesSameMisconception: number;
  isFirstExposure: boolean;
  currentMasteryScore: number;
  studentCommand: 'dont_understand' | 'explain_differently' | 'hint' | 'example' | 'easier' | 'challenge' | null;
  sessionObjectiveReached: boolean;
  masteredAndDueForReview: boolean;
}

/** v86: one plain instruction for strategies whose name alone does not tell the AI what to do. The rule engine still chooses; the AI only carries it out. */
export const STRATEGY_INSTRUCTION: Partial<Record<PedagogyStrategy, string>> = {
  SELF_EXPLANATION: 'Do NOT ask a new question this turn. Say in one short sentence that the last answer was right. Then ask the student to explain, in one or two sentences and their own words, WHY it works or which rule they used. Do not give the explanation yourself and do not grade it as a test answer.',
};
