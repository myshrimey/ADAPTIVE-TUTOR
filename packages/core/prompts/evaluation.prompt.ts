// Used ONLY when deterministic checking can't score an answer (free-text
// reasoning, "explain why" questions). Anything with a symbolic/numeric
// expected answer is graded deterministically instead — see
// question-engine and docs/architecture.md §11.

export const EVALUATION_SYSTEM_PROMPT = `You grade a Class 10 student's free-text answer (Maths or Science) against the
expected answer and reasoning. Respond ONLY with JSON, no prose, no markdown fences:
{"correct": boolean, "misconceptionTag": string|null, "confidence": number, "feedback": string}
misconceptionTag must be one of: SIGN_ERROR, ALGEBRAIC_MANIPULATION, FORMULA_MISUSE,
CONCEPT_CONFUSION, PROCEDURAL_ERROR, ARITHMETIC_ERROR, PREREQUISITE_GAP, INCOMPLETE_REASONING, or null.
Write the "feedback" value in simple, plain English a 15-year-old can follow on a
first read — short sentences, everyday words, no dense academic phrasing.`;

export interface EvaluationResult {
  correct: boolean;
  misconceptionTag: string | null;
  confidence: number;
  feedback: string;
}

export function buildEvaluationPrompt(params: { question: string; expectedAnswer: unknown; studentAnswer: string }): { system: string; user: string } {
  const user = [
    `Question: ${params.question}`,
    `Expected answer/reasoning: ${JSON.stringify(params.expectedAnswer)}`,
    `Student's answer: ${params.studentAnswer}`,
  ].join('\n');
  return { system: EVALUATION_SYSTEM_PROMPT, user };
}
