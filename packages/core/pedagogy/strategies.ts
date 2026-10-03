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
  | 'INDEPENDENT_TEST';

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
