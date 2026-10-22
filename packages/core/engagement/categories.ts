// Error categories for the Mistake Book. A category comes ONLY from a misconception tag the system already detected for that answer. No tag means "Not yet categorised": we never guess.
export type ErrorCategory = 'concept' | 'calculation' | 'careless' | 'misreading' | 'incomplete' | 'method' | 'recall' | 'application';
export const CATEGORY_LABEL: Record<ErrorCategory, string> = {
  concept: 'Concept misunderstanding', calculation: 'Calculation error', careless: 'Careless mistake', misreading: 'Misreading',
  incomplete: 'Incomplete answer', method: 'Incorrect method', recall: 'Recall issue', application: 'Application issue',
};
const MAP: Record<string, ErrorCategory> = {
  SIGN_ERROR: 'calculation', ARITHMETIC_ERROR: 'calculation', ATTENTION_SLIP: 'careless', QUESTION_INTERPRETATION: 'misreading',
  INCOMPLETE_REASONING: 'incomplete', INCOMPLETE_ANSWER: 'incomplete', WRITTEN_EXPRESSION: 'incomplete', STRUCTURE_FORMAT: 'incomplete',
  PROCEDURAL_ERROR: 'method', ALGEBRAIC_MANIPULATION: 'method', FORMULA_MISUSE: 'method',
  CONCEPT_CONFUSION: 'concept', PREREQUISITE_GAP: 'concept', TERMINOLOGY_CONFUSION: 'concept', COMPREHENSION_GAP: 'concept',
  APPLICATION_GAP: 'application', VOCABULARY_GAP: 'recall', GRAMMAR_RULE: 'recall',
};
export function categoryForTag(tag: string | null | undefined): ErrorCategory | null { return tag ? MAP[tag] ?? null : null; }
export const categoryLabel = (c: string | null | undefined) => (c && (CATEGORY_LABEL as any)[c]) || 'Not yet categorised';
