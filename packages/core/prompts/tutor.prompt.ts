// Fixed system prompt + a small injected turn context. See docs/architecture.md §11
// for the rationale (concise, no full history, no emotional/personal-relationship
// language, no psychological speculation).

export const TUTOR_SYSTEM_PROMPT = `You are a patient, structured maths tutor for a CBSE Class 10 student.
- Teach, don't just answer. Ask questions. Keep replies concise.
- Use the selected strategy for this turn; don't switch strategies yourself.
- Give hints before full solutions unless the student has asked for the answer directly.
- Never confirm understanding the student hasn't demonstrated.
- Stay strictly within the current topic/skill; don't introduce unrelated content.
- Use age-appropriate, encouraging language. Never sound like you are role-playing
  a human or forming a personal relationship with the student.
- Never speculate about the student's emotional or mental state.`;

export interface TutorTurnContext {
  skillName: string;
  learningObjective: string;
  strategy: string;
  difficulty: number;
  masteryBand: string;
  masteryScore: number;
  activeMisconception?: string; // plain-language, no jargon, no tag names shown to model output directly
  questionToPose?: { prompt: string; options?: unknown }; // when the strategy calls for a specific bank/generated question, not an LLM-invented one
  evaluationFeedback?: string; // deterministic/LLM grading result to weave into the response, for answer turns
  lastMessages: Array<{ role: 'tutor' | 'student'; content: string }>; // last 2-3 only
  studentMessage: string;
}

// Renders TutorTurnContext into the user turn sent alongside TUTOR_SYSTEM_PROMPT.
// Deliberately small — see Cost Control, docs/architecture.md §13 — only the
// last 2-3 messages, never the full transcript.
export function buildTutorPrompt(context: TutorTurnContext): { system: string; user: string } {
  const history = context.lastMessages
    .map((m) => `${m.role === 'tutor' ? 'Tutor' : 'Student'}: ${m.content}`)
    .join('\n');

  const user = [
    `Skill: ${context.skillName}`,
    `Learning objective: ${context.learningObjective}`,
    `Strategy for this turn: ${context.strategy}`,
    `Difficulty: ${context.difficulty}/5`,
    `Student's mastery on this skill: ${context.masteryBand} (${Math.round(context.masteryScore)}/100)`,
    context.activeMisconception ? `Watch for: ${context.activeMisconception}` : null,
    context.questionToPose
      ? `Pose exactly this question to the student (do not invent your own numbers): ${context.questionToPose.prompt}${
          context.questionToPose.options ? ` Options: ${JSON.stringify(context.questionToPose.options)}` : ''
        }`
      : null,
    context.evaluationFeedback ? `Grading result for the student's last answer: ${context.evaluationFeedback}` : null,
    history ? `\nRecent conversation:\n${history}` : null,
    `\nStudent: ${context.studentMessage}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { system: TUTOR_SYSTEM_PROMPT, user };
}
