import type { XpRules } from './config';

// XP rewards productive learning only. It never rewards opening the app, clicking, answering at random, or repeating the same question for points.
export type ChallengeMode = 'practice' | 'challenge' | 'mixed' | 'boss' | 'weakness' | 'mistake_review' | 'comeback' | 'daily' | 'session_quiz' | 'org';
export interface AnswerRec { qid: string; correct: boolean; seconds: number | null; role?: 'retry' | 'similar' | 'normal'; difficulty?: number }

export interface XpResult { amount: number; breakdown: { label: string; xp: number }[]; fastAnswers: number; repeatedAnswers: number; capped: boolean }

/** A very fast answer is not "productive": it earns nothing and counts toward an internal review flag. Unknown time is given the benefit of the doubt. */
export const isFast = (a: AnswerRec, rules: XpRules) => a.seconds !== null && a.seconds < rules.min_seconds_per_answer;

export function xpForChallenge(mode: ChallengeMode, answers: AnswerRec[], planLength: number, rules: XpRules, ctx: { recentQids: Set<string>; remainingDailyXp: number; completed: boolean }): XpResult {
  const breakdown: { label: string; xp: number }[] = [];
  let fast = 0, repeated = 0, practice = 0, corrected = 0, attempts = 0;
  for (const a of answers) {
    if (isFast(a, rules)) { fast++; continue; }
    if (a.role === 'retry') { if (a.correct) corrected++; else attempts++; continue; }
    if (ctx.recentQids.has(a.qid)) { repeated++; continue; }
    if (a.correct) practice++; else attempts++;
  }
  if (practice) breakdown.push({ label: `${practice} correct answer${practice === 1 ? '' : 's'}`, xp: practice * rules.practice_correct });
  if (attempts) breakdown.push({ label: `${attempts} honest attempt${attempts === 1 ? '' : 's'}`, xp: attempts * rules.practice_attempt });
  if (corrected) breakdown.push({ label: `${corrected} mistake${corrected === 1 ? '' : 's'} corrected`, xp: corrected * rules.mistake_corrected });
  // Completion bonus: only for a real finish (enough answers, most of them not rushed).
  const enough = answers.length >= Math.min(3, Math.max(1, planLength)) && fast <= answers.length / 2;
  if (ctx.completed && enough) {
    const bonus = mode === 'boss' ? rules.boss_complete : mode === 'daily' ? rules.daily_challenge : mode === 'mistake_review' || mode === 'comeback' ? rules.revision : mode === 'weakness' ? rules.weak_practice_bonus : rules.quiz_complete;
    if (bonus) breakdown.push({ label: mode === 'boss' ? 'Boss Battle finished' : mode === 'daily' ? 'Challenge of the Day' : mode === 'weakness' ? 'Weakness Battle finished' : mode === 'mistake_review' || mode === 'comeback' ? 'Revision round' : 'Round finished', xp: bonus });
  }
  const raw = breakdown.reduce((n, b) => n + b.xp, 0);
  const amount = Math.max(0, Math.min(raw, ctx.remainingDailyXp));
  return { amount, breakdown, fastAnswers: fast, repeatedAnswers: repeated, capped: amount < raw };
}

/** Patterns for a person to look at. Never shown to the student and never an accusation. */
export function suspiciousPattern(answers: AnswerRec[], rules: XpRules): string | null {
  if (answers.length < 4) return null;
  const fast = answers.filter((a) => isFast(a, rules)).length;
  if (fast / answers.length >= 0.7) return 'many_very_fast_answers';
  const timed = answers.filter((a) => a.seconds !== null);
  if (timed.length >= 6 && answers.every((a) => a.correct) && timed.every((a) => (a.seconds as number) <= rules.min_seconds_per_answer + 1)) return 'all_correct_unusually_fast';
  return null;
}
