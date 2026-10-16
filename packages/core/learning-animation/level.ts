import { bandForScore } from '../mastery/types';

// Level-adaptive presentation for the learning module.
//
// The animation "level" is chosen from the student's CURRENT mastery of the skill
// being taught, using the same bands the rest of the app uses. It changes only
// how things are presented (pacing, how much is spelled out, how loud a
// celebration is). It never changes mastery, difficulty or what is asked, and it
// is not a label for the child — it describes how much support the picture gives.
//
//   guided   (needs_foundation, emerging) : slow, step-by-step reveal; reassuring wording
//   standard (developing)                 : moderate pace; short reveal
//   brisk    (strong, mastered)           : quick and minimal; a challenge cue instead of hand-holding
//
// All motion is switched off by prefers-reduced-motion in the CSS.

export type AnimationLevel = 'guided' | 'standard' | 'brisk';

export function animationLevelForScore(score: number | null | undefined): AnimationLevel {
  if (score === null || score === undefined || Number.isNaN(score)) return 'guided'; // brand-new skill: most support
  const band = bandForScore(Math.max(0, Math.min(100, score)));
  if (band === 'needs_foundation' || band === 'emerging') return 'guided';
  if (band === 'developing') return 'standard';
  return 'brisk';
}

export const BAND_ORDER = ['needs_foundation', 'emerging', 'developing', 'strong', 'mastered'] as const;

/** True when the ending band is higher than the starting band (a "level up" moment). */
export function crossedIntoHigherBand(startScore: number, endScore: number): boolean {
  return BAND_ORDER.indexOf(bandForScore(endScore) as any) > BAND_ORDER.indexOf(bandForScore(startScore) as any);
}
