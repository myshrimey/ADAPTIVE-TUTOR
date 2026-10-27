// Error intelligence (master prompt sections 8-9), pure rules, no AI. A mistake is not just "wrong": the KIND of mistake decides what helps.
// This turns recent mistakes into a pattern and a ready plan (for example "2 worked examples + 3 guided problems + 2 retrieval questions + later review").
// It is advice for a tutor or parent; it is never shown to a child as a label, and one slip is never called a pattern.

export type ErrorFamily = 'factual' | 'conceptual' | 'procedural' | 'calculation' | 'careless' | 'interpretation' | 'reasoning' | 'prerequisite' | 'language' | 'question_misunderstanding' | 'incomplete';
export const ERROR_FAMILIES: ErrorFamily[] = ['factual', 'conceptual', 'procedural', 'calculation', 'careless', 'interpretation', 'reasoning', 'prerequisite', 'language', 'question_misunderstanding', 'incomplete'];
// Not mapped: "unsupported reasoning" (no signal for it yet) and guessing / unknown (too little to say).

/** Tutor-session misconception tags -> family. */
export const TAG_FAMILY: Record<string, ErrorFamily> = {
  SIGN_ERROR: 'procedural', ALGEBRAIC_MANIPULATION: 'procedural', PROCEDURAL_ERROR: 'procedural', FORMULA_MISUSE: 'conceptual', CONCEPT_CONFUSION: 'conceptual',
  ARITHMETIC_ERROR: 'calculation', PREREQUISITE_GAP: 'prerequisite', INCOMPLETE_REASONING: 'incomplete', TERMINOLOGY_CONFUSION: 'factual', APPLICATION_GAP: 'reasoning',
  QUESTION_INTERPRETATION: 'interpretation', ATTENTION_SLIP: 'careless', COMPREHENSION_GAP: 'language', GRAMMAR_RULE: 'factual', VOCABULARY_GAP: 'factual',
  STRUCTURE_FORMAT: 'incomplete', WRITTEN_EXPRESSION: 'language', INCOMPLETE_ANSWER: 'incomplete',
};
/** Adaptive-check evidence error types -> family. GUESSING and UNKNOWN say nothing about cause, so they are left out. */
export const EVIDENCE_FAMILY: Record<string, ErrorFamily> = {
  FOUNDATIONAL_GAP: 'prerequisite', CONCEPTUAL_GAP: 'conceptual', PROCEDURAL_GAP: 'procedural', CALCULATION_ERROR: 'calculation', READING_ERROR: 'question_misunderstanding',
  INTERPRETATION_ERROR: 'interpretation', REASONING_ERROR: 'reasoning', APPLICATION_GAP: 'reasoning', CARELESS_ERROR: 'careless', LANGUAGE_DIFFICULTY: 'language', QUESTION_MISREAD: 'question_misunderstanding',
};

export interface RecipeStep { kind: 'worked_example' | 'guided_problem' | 'retrieval' | 'practice' | 'conversation' | 'earlier_skill'; count: number; text: string }
export interface Recipe { family: ErrorFamily; title: string; likelyCause: string; steps: RecipeStep[]; spacedReview: string; tutorTip: string; parentTip: string }

export const RECIPES: Record<ErrorFamily, Recipe> = {
  procedural: { family: 'procedural', title: 'Steps done out of order or incompletely', likelyCause: 'The idea may be understood but the steps are not yet automatic.', spacedReview: 'Ask 2 short questions on it after 2 days and again after 7 days.',
    steps: [{ kind: 'worked_example', count: 2, text: 'Show 2 worked examples with every step written out and named' }, { kind: 'guided_problem', count: 3, text: 'Do 3 problems together, the student writing each step' }, { kind: 'retrieval', count: 2, text: 'Then 2 questions on their own, steps written out' }],
    tutorTip: 'Ask the student to say what the next step is before doing it.', parentTip: 'Ask your child to show their working on paper; praise neat steps, not only the answer.' },
  calculation: { family: 'calculation', title: 'Right method, slips in the arithmetic', likelyCause: 'The method looks understood; basic calculation needs more fluency.', spacedReview: 'Five short sums again after 2 days and after a week.',
    steps: [{ kind: 'practice', count: 5, text: 'Five short calculation drills of the kind that went wrong (no new ideas)' }, { kind: 'retrieval', count: 2, text: 'Then 2 full questions, checking each calculation twice' }],
    tutorTip: 'Do not re-teach the method; train the calculation and a quick estimate check.', parentTip: 'Short daily mental-maths for 5 minutes helps more than one long session.' },
  careless: { family: 'careless', title: 'Looks like slips rather than gaps', likelyCause: 'The answers suggest the idea is known but attention slipped.', spacedReview: 'Check again after 3 days.',
    steps: [{ kind: 'practice', count: 3, text: 'Three problems where the student checks the answer by substituting or re-reading before submitting' }, { kind: 'retrieval', count: 2, text: '2 mixed questions with a "read the question twice" habit' }],
    tutorTip: 'Praise the check, not speed. Do not re-teach what they know.', parentTip: 'Encourage a calm pace; a rushed evening makes slips more likely.' },
  conceptual: { family: 'conceptual', title: 'Two ideas mixed up, or an idea not yet clear', likelyCause: 'The idea itself may need to be built again, not just practised.', spacedReview: 'Ask the student to explain it in their own words after 2 days and 7 days.',
    steps: [{ kind: 'worked_example', count: 1, text: 'One worked example that puts the two ideas side by side and shows how they differ' }, { kind: 'conversation', count: 2, text: 'Ask the student to explain the idea in their own words, twice, on different examples' }, { kind: 'guided_problem', count: 3, text: '3 guided problems, with a hint only after a try' }, { kind: 'retrieval', count: 2, text: '2 questions on their own, on a different example' }],
    tutorTip: 'Ask "why" more than "what". A picture or a real-life example often helps.', parentTip: 'Ask your child to explain it to you as if you were the student.' },
  prerequisite: { family: 'prerequisite', title: 'An earlier skill is missing', likelyCause: 'This topic depends on a skill from before that is not yet secure.', spacedReview: 'Re-check the earlier skill after 3 days, then go back to this topic.',
    steps: [{ kind: 'earlier_skill', count: 1, text: 'Go back to the earlier skill the learning path names and secure it first' }, { kind: 'guided_problem', count: 3, text: '3 guided problems on that earlier skill' }, { kind: 'retrieval', count: 2, text: 'Then return to this topic with 2 questions' }],
    tutorTip: 'Say plainly that this is a normal gap in the path, not a failure.', parentTip: 'Following the learning path (not skipping ahead) is the quickest route.' },
  interpretation: { family: 'interpretation', title: 'Question read differently from what it asks', likelyCause: 'The student may be solving a different question from the one asked.', spacedReview: 'Check again after 3 days.',
    steps: [{ kind: 'practice', count: 3, text: 'Three problems: first underline what is given and what is asked, then solve' }, { kind: 'retrieval', count: 2, text: '2 questions where the student says the question in their own words first' }],
    tutorTip: 'Make "what is the question asking?" a spoken habit.', parentTip: 'Ask your child to tell you in their own words what a question wants before solving it.' },
  question_misunderstanding: { family: 'question_misunderstanding', title: 'Question misread', likelyCause: 'A word or condition in the question may have been missed.', spacedReview: 'Check again after 3 days.',
    steps: [{ kind: 'practice', count: 3, text: 'Three problems with a circled keyword or condition in each' }, { kind: 'retrieval', count: 2, text: '2 questions, reading aloud once before answering' }],
    tutorTip: 'Reading aloud slowly often catches the missed word.', parentTip: 'Encourage reading each question twice; it is a habit to build, not a fault.' },
  reasoning: { family: 'reasoning', title: 'Knows the idea, struggles to apply it', likelyCause: 'The idea is known, but using it in a new situation is harder.', spacedReview: 'Try one new-situation question after 2 days and one after a week.',
    steps: [{ kind: 'worked_example', count: 1, text: 'One worked example in an unfamiliar setting, thinking aloud' }, { kind: 'guided_problem', count: 3, text: '3 application problems, asking "what do I know, what do I need?"' }, { kind: 'retrieval', count: 2, text: '2 application questions with no hints' }],
    tutorTip: 'Use real situations from the student\'s own life.', parentTip: 'Ask where your child sees this idea around them.' },
  factual: { family: 'factual', title: 'A fact, term or rule not yet firm', likelyCause: 'A term or rule may not be remembered accurately yet.', spacedReview: 'Quick recall after 1 day, 3 days and 7 days.',
    steps: [{ kind: 'retrieval', count: 5, text: 'Five quick recall questions on the terms or rules that went wrong' }, { kind: 'practice', count: 2, text: '2 questions that use the terms in a sentence' }],
    tutorTip: 'Short, frequent recall beats one long re-read.', parentTip: 'Ask 3 quick questions at dinner; no marks, just a game.' },
  language: { family: 'language', title: 'Difficulty may be the language of the question', likelyCause: 'The question may be harder to read than the idea is to understand.', spacedReview: 'Same skill in the other language after 3 days.',
    steps: [{ kind: 'conversation', count: 1, text: 'Go through the key words of the topic in both languages' }, { kind: 'practice', count: 3, text: '3 questions in the language the student prefers, then the same type in the exam language' }],
    tutorTip: 'Check the Hindi/English choice in the student\'s settings; a mismatch can hide real understanding.', parentTip: 'Letting your child read the question in their stronger language first is fine while learning.' },
  incomplete: { family: 'incomplete', title: 'Answers stop short', likelyCause: 'The idea may be there but the answer is not fully written out.', spacedReview: 'Check again after 3 days.',
    steps: [{ kind: 'worked_example', count: 1, text: 'One full model answer with a checklist of what a complete answer has' }, { kind: 'guided_problem', count: 3, text: '3 questions, the student ticking the checklist before finishing' }, { kind: 'retrieval', count: 1, text: '1 new question on their own, checked against the checklist afterwards' }],
    tutorTip: 'Give the checklist; fade it later.', parentTip: 'Ask "is there anything else the question wanted?"' },
};

export interface ErrorPattern { family: ErrorFamily; count: number; share: number; recipe: Recipe }
export const MIN_COUNT = 3;
export const MIN_SHARE = 0.4;

/** The main pattern in a set of recent mistakes, or null when there is too little to say. One or two slips are never a pattern. */
export function dominantPattern(counts: Partial<Record<ErrorFamily, number>>): ErrorPattern | null {
  const entries = Object.entries(counts).filter(([, n]) => (n ?? 0) > 0) as [ErrorFamily, number][];
  const total = entries.reduce((a, [, n]) => a + n, 0);
  if (total < MIN_COUNT) return null;
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [family, count] = entries[0];
  const share = count / total;
  if (count < MIN_COUNT || share < MIN_SHARE) return null;
  return { family, count, share: Math.round(share * 100) / 100, recipe: RECIPES[family] };
}

export function countFamilies(tags: (string | null | undefined)[], evidenceTypes: (string | null | undefined)[]): Partial<Record<ErrorFamily, number>> {
  const out: Partial<Record<ErrorFamily, number>> = {};
  for (const t of tags) { const f = t ? TAG_FAMILY[t] : undefined; if (f) out[f] = (out[f] ?? 0) + 1; }
  for (const t of evidenceTypes) { const f = t ? EVIDENCE_FAMILY[t] : undefined; if (f) out[f] = (out[f] ?? 0) + 1; }
  return out;
}

export const planText = (r: Recipe): string => `${r.steps.map((s) => s.text).join('; ')}. ${r.spacedReview}`;
