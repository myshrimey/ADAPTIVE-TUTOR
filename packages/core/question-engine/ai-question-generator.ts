import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { gradeAnswer } from './grading';

// The one place that actually asks the AI to invent a brand-new CBSE Class 10
// question (prompt + answer + worked solution) for a given skill and
// difficulty, with no question bank involved at all. Used wherever the bank
// is thin for that skill/difficulty: regular learning-session practice
// (question-engine/selector.ts), and the post-session quiz
// (quiz/skill-quiz.engine.ts) when a skill doesn't yet have enough banked
// questions to fill a 5-question quiz.
//
// Generating the worked solution in the SAME call as the question (rather
// than only lazily on a miss, as ensure-explanation.ts does for older bank
// content) costs one extra sentence of output per question, not an extra AI
// call — and asking the model to produce its own step-by-step solution
// alongside the final answer measurably reduces arithmetic slips versus
// asking it to just blurt out a bare final value.

export interface GeneratedQuestion {
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric' | 'step';
  options?: string[] | null;
  expectedAnswer: { value: string };
  explanation: string;
}

export interface GenerateQuestionParams {
  subjectName: string; // e.g. "Mathematics" or "Science" — NOT hardcoded, unlike the old selector.ts prompt
  skillName: string;
  difficulty: number; // 1-5
  learningObjective?: string;
  recentMisconceptions?: string[];
  // Prompts already used recently for this skill/student — asked to vary
  // the next one rather than hand back a near-duplicate.
  avoidPrompts?: string[];
}

const SYSTEM_PROMPT = `You write a single CBSE Class 10 practice question for the named subject (Mathematics or
Science). Respond ONLY with JSON, no prose, no markdown fences:
{"prompt": string, "questionType": "mcq"|"short_answer"|"numeric"|"step", "options": string[]|null,
"expectedAnswer": {"value": string}, "explanation": string}.

Requirements:
- The question must test exactly the named skill, at exactly the named difficulty (1 = foundational recall,
  5 = multi-step/applied), strictly within the CBSE Class 10 syllabus for that skill — nothing from a later
  grade and nothing off-syllabus.
- If the subject name contains "(Basic)", pitch the question at CBSE Mathematics BASIC level: a direct, single-concept
  application with simple numbers, never a multi-step or proof-style question (same syllabus unit, easier paper).
- It must have exactly one unambiguous correct answer (no "it depends", no open-ended opinion).
- "explanation" is a short, correct, step-by-step solution a student could follow to independently reach
  expectedAnswer.value — not just a restatement of the answer.
- Work the problem through yourself step by step before writing expectedAnswer.value, and check that
  "explanation"'s own final line matches expectedAnswer.value exactly — an internally inconsistent or
  arithmetically wrong question is worse than no question at all.
- Use plain, age-appropriate language a Class 10 student would see in an actual textbook or exam.
- Whenever "prompt" or "explanation" contains a mathematical equation or expression, wrap it in single
  dollar signs for inline math (e.g. $x^2 - 3x + 2 = 0$) or double dollar signs on its own line for a
  displayed equation. Use real LaTeX inside the dollar signs (\\frac, \\sqrt, ^, _), not plain text like
  "sqrt(3)" or "x^2" outside of dollar signs — the app renders anything between dollar signs as math.`;

/** Throws on a malformed (non-JSON) response; validateGeneratedQuestion() below catches a well-formed-but-wrong shape. */
export async function generateQuestionWithSolution(
  aiProvider: AIProvider,
  params: GenerateQuestionParams
): Promise<GeneratedQuestion> {
  const userMessage = [
    `Subject: ${params.subjectName}`,
    `Skill: ${params.skillName}`,
    params.learningObjective ? `Learning objective: ${params.learningObjective}` : null,
    `Difficulty: ${params.difficulty}/5`,
    params.recentMisconceptions?.length ? `Recent misconceptions to probe for: ${params.recentMisconceptions.join(', ')}` : null,
    params.avoidPrompts?.length
      ? `Write a question meaningfully different from these already-used ones (don't just change the numbers):\n${params.avoidPrompts
          .map((p) => `- ${p}`)
          .join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await aiProvider.complete({ systemPrompt: SYSTEM_PROMPT, userMessage, responseFormat: 'json', feature: 'question_generation' });

  try {
    return JSON.parse(result.text) as GeneratedQuestion;
  } catch {
    throw new Error('generated_question_not_valid_json');
  }
}

export function validateGeneratedQuestion(q: GeneratedQuestion): { valid: boolean; reason?: string } {
  if (!q.prompt || q.prompt.trim().length < 5) return { valid: false, reason: 'prompt_too_short' };
  if (!['mcq', 'short_answer', 'numeric', 'step'].includes(q.questionType)) return { valid: false, reason: 'invalid_question_type' };
  if (q.questionType === 'mcq' && (!q.options || q.options.length < 2)) return { valid: false, reason: 'mcq_missing_options' };
  if (!q.expectedAnswer || !q.expectedAnswer.value) return { valid: false, reason: 'missing_expected_answer' };
  if (!q.explanation || q.explanation.trim().length < 5) return { valid: false, reason: 'missing_explanation' };
  return { valid: true };
}

const SOLVER_PROMPT = `You are solving a CBSE Class 10 question independently. Work it out step by step yourself.
Respond ONLY with JSON, no prose, no markdown fences: {"answer": string}.
For a multiple-choice question give the exact text of the ONE option you pick. For a numeric or short-answer
question give only the final value or short answer.`;

/**
 * Second, independent AI call: a solver that is NOT shown the stored answer or explanation. A generated question is
 * kept only when the solver reaches the same answer. This catches many wrong answer keys, but it is not proof of
 * correctness; generated questions stay "needs_review" until a person checks them.
 */
export async function verifyGeneratedQuestion(aiProvider: AIProvider, q: GeneratedQuestion): Promise<boolean> {
  try {
    const userMessage = [`Question: ${q.prompt}`, q.options?.length ? `Options:\n${q.options.map((o) => `- ${o}`).join('\n')}` : null].filter(Boolean).join('\n');
    const r = await aiProvider.complete({ systemPrompt: SOLVER_PROMPT, userMessage, responseFormat: 'json', feature: 'question_generation' });
    const solved = String((JSON.parse(r.text) as { answer?: unknown }).answer ?? '').trim();
    if (!solved) return false;
    const norm = (x: string) => x.replace(/\s+/g, ' ').trim().toLowerCase();
    const expected = String(q.expectedAnswer?.value ?? '');
    return norm(solved) === norm(expected) || gradeAnswer({ value: expected }, { value: solved });
  } catch {
    return false;
  }
}
