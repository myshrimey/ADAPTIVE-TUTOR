import type { MasteryBand, MasteryComponents } from '../learner-model/types';

// The mastery formula lives ONLY here and in mastery.service.ts (Day 3).
// Every other module reads a computed SkillMastery — nothing else re-derives it.
export const MASTERY_WEIGHTS = {
  recentAccuracy: 0.4,
  applicationPerformance: 0.2,
  consistency: 0.15,
  independentPerformance: 0.15,
  retention: 0.1,
} as const;

export const MASTERY_BANDS: Array<{ min: number; max: number; band: MasteryBand }> = [
  { min: 0, max: 39, band: 'needs_foundation' },
  { min: 40, max: 59, band: 'emerging' },
  { min: 60, max: 74, band: 'developing' },
  { min: 75, max: 89, band: 'strong' },
  { min: 90, max: 100, band: 'mastered' },
];

// Retention has too few data points before a spaced gap has occurred (e.g. week 1 of
// use). Default to this neutral value until >=2 attempts on the skill are separated
// by >=3 days — documented here so the "why" travels with the code, not just the doc.
export const RETENTION_DEFAULT_SCORE = 70;

export function bandForScore(score: number): MasteryBand {
  return MASTERY_BANDS.find((b) => score >= b.min && score <= b.max)!.band;
}

export function computeMasteryScore(components: MasteryComponents): number {
  const raw =
    MASTERY_WEIGHTS.recentAccuracy * components.recentAccuracy +
    MASTERY_WEIGHTS.applicationPerformance * components.applicationPerformance +
    MASTERY_WEIGHTS.consistency * components.consistency +
    MASTERY_WEIGHTS.independentPerformance * components.independentPerformance +
    MASTERY_WEIGHTS.retention * components.retention;
  return Math.max(0, Math.min(100, raw));
}
