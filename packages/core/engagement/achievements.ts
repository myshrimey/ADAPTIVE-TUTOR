// Achievements are rules on real behaviour: metric >= threshold. The catalogue lives in the database (table `achievements`); this default copy is used if it cannot be read and by tests.
export type AchievementMetric = 'longest_streak' | 'diagnostics_done' | 'lessons_done' | 'skills_mastered' | 'chapters_mastered' | 'best_improvement' | 'quizzes_done' | 'mocks_done' | 'mock_improved' | 'hard_challenges' | 'mistakes_corrected' | 'repeat_mistakes_corrected' | 'chapter_checkpoints' | 'subject_checkpoints' | 'revision_rounds' | 'stretch_correct' | 'stretch_best_run' | 'stretch_level3' | 'stretch_styles' | 'stretch_subjects';
export type AchievementMetrics = Record<AchievementMetric, number>;
export interface AchievementDef { code: string; category: string; title: string; description: string; metric: AchievementMetric; threshold: number; xp: number; sort?: number; active?: boolean }
export const EMPTY_METRICS: AchievementMetrics = { longest_streak: 0, diagnostics_done: 0, lessons_done: 0, skills_mastered: 0, chapters_mastered: 0, best_improvement: 0, quizzes_done: 0, mocks_done: 0, mock_improved: 0, hard_challenges: 0, mistakes_corrected: 0, repeat_mistakes_corrected: 0, chapter_checkpoints: 0, subject_checkpoints: 0, revision_rounds: 0, stretch_correct: 0, stretch_best_run: 0, stretch_level3: 0, stretch_styles: 0, stretch_subjects: 0 };

export function evaluateAchievements(metrics: Partial<AchievementMetrics>, catalogue: AchievementDef[], unlocked: Set<string>): { def: AchievementDef; value: number }[] {
  const out: { def: AchievementDef; value: number }[] = [];
  for (const def of catalogue) {
    if (def.active === false || unlocked.has(def.code)) continue;
    const v = Number(metrics[def.metric] ?? 0);
    if (v >= def.threshold) out.push({ def, value: v });
  }
  return out;
}
/** Progress toward a locked achievement, 0-1, for the "what next" display. */
export const achievementProgress = (metrics: Partial<AchievementMetrics>, def: AchievementDef) => Math.max(0, Math.min(1, Number(metrics[def.metric] ?? 0) / def.threshold));

/** Largest gain, in percentage points, between a subject's FIRST scored attempt and its best later one. Needs at least 3 scored attempts so one lucky round is not enough. */
export function bestImprovement(seriesBySubject: Record<string, number[]>): number {
  let best = 0;
  for (const s of Object.values(seriesBySubject)) { if (s.length < 3) continue; best = Math.max(best, Math.max(...s.slice(1)) - s[0]); }
  return Math.round(best);
}
/** 1 when, in some subject, a later mock scored higher than an earlier one (series in time order). */
export function mockImproved(mockSeries: Record<string, number[]>): number {
  for (const s of Object.values(mockSeries)) for (let i = 1; i < s.length; i++) for (let j = 0; j < i; j++) if (s[i] > s[j]) return 1;
  return 0;
}
