// Question intelligence (master prompt v3, sec. 26-27): how each question actually behaves with
// real students, set against the difficulty it was given when written. Pure rules; no AI.
// A question is only judged from MIN_ATTEMPTS answers. Fewer = "not enough attempts yet".

export const MIN_ATTEMPTS = 20;
/** Difference (on the 1-5 scale) between written and observed difficulty that is worth a teacher's look. */
export const MISMATCH_GAP = 2;

export interface AttemptRow {
  questionId: string;
  correct: boolean;
  hintsUsed?: number | null;
  seconds?: number | null;
}

export interface QuestionStat {
  questionId: string;
  attempts: number;
  percentCorrect: number | null; // null until MIN_ATTEMPTS
  avgSeconds: number | null;
  hintPercent: number | null; // share of attempts that used at least one hint (practice questions only)
  observedDifficulty: number | null; // 1 (very easy) to 5 (very hard), from percent correct
  enough: boolean;
}

/** 90%+ correct = 1 ... under 20% correct = 5. */
export function observedDifficultyFromPercent(percentCorrect: number): number {
  if (percentCorrect >= 80) return 1;
  if (percentCorrect >= 60) return 2;
  if (percentCorrect >= 40) return 3;
  if (percentCorrect >= 20) return 4;
  return 5;
}

export function summariseQuestions(rows: AttemptRow[]): Map<string, QuestionStat> {
  const by = new Map<string, AttemptRow[]>();
  for (const r of rows) by.set(r.questionId, [...(by.get(r.questionId) ?? []), r]);
  const out = new Map<string, QuestionStat>();
  for (const [id, list] of by) {
    const n = list.length;
    const enough = n >= MIN_ATTEMPTS;
    const pct = (list.filter((r) => r.correct).length / n) * 100;
    const times = list.map((r) => r.seconds).filter((x): x is number => typeof x === 'number' && x > 0 && x < 3600);
    const hintsKnown = list.some((r) => r.hintsUsed !== undefined && r.hintsUsed !== null);
    out.set(id, {
      questionId: id,
      attempts: n,
      percentCorrect: enough ? Math.round(pct) : null,
      avgSeconds: times.length >= 5 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      hintPercent: enough && hintsKnown ? Math.round((list.filter((r) => (r.hintsUsed ?? 0) > 0).length / n) * 100) : null,
      observedDifficulty: enough ? observedDifficultyFromPercent(pct) : null,
      enough,
    });
  }
  return out;
}

/** Written (1-5) vs observed difficulty: 'harder' / 'easier' than written, or null when close or not enough data. */
export function difficultyMismatch(written: number, stat: QuestionStat): 'harder_than_written' | 'easier_than_written' | null {
  if (!stat.enough || stat.observedDifficulty === null) return null;
  const gap = stat.observedDifficulty - written;
  if (gap >= MISMATCH_GAP) return 'harder_than_written';
  if (gap <= -MISMATCH_GAP) return 'easier_than_written';
  return null;
}
