// Task taxonomy for the AI gateway. Tier 0 = ordinary application logic: it must NEVER reach an AI model.
export type TaskTier = 0 | 1 | 2 | 3;
export interface TaskDef { tier: TaskTier; label: string; /** essential tasks keep working (on free routes) when a spend cap is reached */ essential: boolean }

export const TASKS: Record<string, TaskDef> = {
  tutor: { tier: 2, label: 'AI tutor reply', essential: true },
  evaluation: { tier: 2, label: 'Answer marking', essential: true },
  explanation: { tier: 1, label: 'Explanation', essential: false },
  summary: { tier: 1, label: 'Session summary', essential: false },
  misconception: { tier: 1, label: 'Misconception check', essential: false },
  question_generation: { tier: 2, label: 'Question generation', essential: false },
  handwriting: { tier: 3, label: 'Handwritten answer evaluation', essential: true },
  translation: { tier: 1, label: 'Translation', essential: false },
  benchmark: { tier: 1, label: 'Benchmark run (admin)', essential: false },
  provider_test: { tier: 1, label: 'Provider test (admin)', essential: false },
  other: { tier: 1, label: 'Other', essential: false },
};

/** Work that is plain arithmetic / counting: never sent to a language model. */
export const TIER0_TASKS = ['marks', 'percentage', 'xp', 'streak', 'leaderboard', 'badge', 'attendance', 'progress', 'question_count', 'chapter_completion', 'ranking', 'usage_stats',
  // v59: the exact names in the founder's list, so a caller using them is refused too
  'marks_calculation', 'percentage_calculation', 'leaderboard_ranking', 'xp_award', 'attempt_count', 'progress_calculation', 'subscription_status', 'billing_calculation'] as const;

export function taskFor(feature: string | undefined): TaskDef & { key: string } {
  const key = feature && TASKS[feature] ? feature : 'other';
  return { key, ...TASKS[key] };
}

/** Throws when a Tier 0 job is sent to the gateway (a programming error: it should be ordinary code). */
export function assertAiAllowed(feature: string | undefined): void {
  if (feature && (TIER0_TASKS as readonly string[]).includes(feature)) throw new Error(`tier0_no_ai: "${feature}" is plain application logic and must not call an AI model`);
}
