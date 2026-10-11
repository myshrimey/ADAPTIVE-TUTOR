// Used when a diagnostic/quiz question's authored `explanation` is missing
// (most of the 1112 Maths + 929 Science bank predates that field — see
// migrations/0005_diagnostic_explanation.sql) and a student just got it
// wrong. Rather than a multi-week project hand-writing ~1750 explanations,
// one gets generated here on the spot, the first time it's actually needed,
// and is then saved back onto the question (see explanations/ensure-explanation.ts)
// so every future student who misses that same question gets it instantly
// with no further AI call — the bank fills itself in over time.

export const EXPLANATION_SYSTEM_PROMPT = `A CBSE Class 10 student just answered a question incorrectly. Write a short
explanation of why the correct answer is correct, in simple, plain English a
15-year-old can follow on a first read — short sentences, everyday words,
explain any technical term the first time you use it. Walk through the key
step(s), don't just restate the answer. 2-4 sentences. Respond with ONLY the
explanation text — no JSON, no markdown, no "Explanation:" prefix.`;

export function buildExplanationPrompt(params: {
  prompt: string;
  questionType: string;
  options?: unknown;
  expectedAnswer: unknown;
}): { system: string; user: string } {
  const lines = [
    `Question: ${params.prompt}`,
    `Question type: ${params.questionType}`,
    params.options ? `Options: ${JSON.stringify(params.options)}` : null,
    `Correct answer: ${JSON.stringify(params.expectedAnswer)}`,
  ].filter(Boolean);
  return { system: EXPLANATION_SYSTEM_PROMPT, user: lines.join('\n') };
}
