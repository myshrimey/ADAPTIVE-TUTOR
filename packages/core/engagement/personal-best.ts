// "Beat your best": compare a new score with the student's own history only.
export type BestKind = 'quiz_score' | 'chapter_score' | 'mock_score' | 'best_streak' | 'mistakes_corrected_day' | 'largest_improvement';
export const BEST_LABEL: Record<BestKind, string> = { quiz_score: 'Best quiz score', chapter_score: 'Best chapter score', mock_score: 'Best mock score', best_streak: 'Best streak', mistakes_corrected_day: 'Most mistakes corrected in a day', largest_improvement: 'Largest improvement' };
export interface BestResult { kind: 'first' | 'new_best' | 'not_best'; previous: number | null; value: number; message: string }

/** First score is recorded as a starting point, not announced as a "best". A new best must be strictly higher than the old best. */
export function compareBest(previousBest: number | null, value: number, unit = '%'): BestResult {
  if (previousBest === null || previousBest === undefined) return { kind: 'first', previous: null, value, message: `First score recorded: ${value}${unit}. This is your starting point.` };
  if (value > previousBest) return { kind: 'new_best', previous: previousBest, value, message: `NEW PERSONAL BEST! Previous best: ${previousBest}${unit}. New score: ${value}${unit}.` };
  return { kind: 'not_best', previous: previousBest, value, message: `Your best is still ${previousBest}${unit}. This round: ${value}${unit}. Can you beat it?` };
}
/** Only rounds with enough questions count toward a percentage best, so 1 of 1 correct is not "100%". */
export const MIN_QUESTIONS_FOR_BEST = 5;
