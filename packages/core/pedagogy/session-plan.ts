// Plans how long a learning session should run from what the student told us before it
// (minutes available, goal), and decides when a session should switch to a gentler path
// because of how the answers are going. Pure functions, no database.

export type SessionGoalCode = 'learn' | 'practise' | 'revise' | 'fix_mistakes' | 'test_myself';

export interface SessionPlan {
  /** Questions to attempt before wrapping up; null when the student gave no time (open-ended). */
  targetQuestions: number | null;
}

// Planning defaults, not measured values: minutes of a session one question (with the teaching around it) takes.
const MINUTES_PER_QUESTION: Record<SessionGoalCode, number> = { learn: 4, practise: 2.5, revise: 2, fix_mistakes: 3, test_myself: 1.5 };

export function planSession(input: { availableMinutes: number | null; goal: SessionGoalCode | null; recoveryMode: boolean }): SessionPlan {
  if (!input.availableMinutes || input.availableMinutes <= 0) return { targetQuestions: null };
  const per = MINUTES_PER_QUESTION[input.goal ?? 'practise'];
  // Keep ~20% of the time for the wrap-up; a gentler session is also a shorter one.
  let n = (input.availableMinutes * 0.8) / per;
  if (input.recoveryMode) n *= 0.75;
  return { targetQuestions: Math.max(3, Math.min(15, Math.round(n))) };
}

/**
 * Performance-triggered recovery: 3 or more misses in the last 4 answers, or 2 misses in a
 * row that each needed 2+ hints. Looks only at answers, never at who the student is.
 */
export function shouldTriggerRecovery(recent: { correct: boolean; hints: number }[]): boolean {
  const last4 = recent.slice(-4);
  if (last4.filter((a) => !a.correct).length >= 3) return true;
  const last2 = recent.slice(-2);
  return last2.length === 2 && last2.every((a) => !a.correct && a.hints >= 2);
}
