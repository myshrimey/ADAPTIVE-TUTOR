// Pure rules for choosing questions in challenges. Difficulty is the question bank's own 1-5 value: nothing is made "harder" artificially.
import type { ChallengeMode } from './xp';

export interface BankQ { id: string; skill_id: string; difficulty: number; question_type?: string; marks?: number | null; cognitive_level?: string | null }

/** Starting difficulty from a mastery score (0-100). Unknown mastery starts in the middle. */
export function startDifficulty(mastery: number | null): number {
  if (mastery === null || mastery === undefined) return 2;
  if (mastery < 40) return 1; if (mastery < 60) return 2; if (mastery < 75) return 3; if (mastery < 90) return 4; return 5;
}
/** Weakness Battle steps: two right in a row go up one level, a wrong answer goes down one. Basic -> moderate -> difficult on what the student shows. */
export function nextBattleDifficulty(current: number, history: { correct: boolean }[]): number {
  const n = history.length; if (!n) return current;
  const last = history[n - 1];
  if (!last.correct) return Math.max(1, current - 1);
  if (n >= 2 && history[n - 2].correct) return Math.min(5, current + 1);
  return current;
}
export const MODE_SIZE: Record<ChallengeMode, number> = { practice: 6, challenge: 6, mixed: 8, boss: 10, weakness: 8, mistake_review: 6, comeback: 8, daily: 1, session_quiz: 5, org: 8 };

/** Boss Battle: ten questions in rising difficulty; the last three prefer application / reasoning (cognitive level) and the hardest the bank has. Returns [] when the bank is too thin to be a fair boss. */
export function composeBoss(pool: BankQ[], size = 10): BankQ[] {
  const uniq = [...new Map(pool.map((q) => [q.id, q])).values()];
  if (uniq.length < size) return [];
  const rank = (q: BankQ) => q.difficulty * 10 + (/apply|analy|reason|evaluat|creat/i.test(q.cognitive_level ?? '') ? 5 : 0) + (q.marks ?? 0) * 0.1;
  const sorted = [...uniq].sort((a, b) => rank(a) - rank(b));
  // spread: take evenly spaced questions from easiest to hardest, so difficulty "gradually increases" and ends on the hardest.
  const picked: BankQ[] = [];
  for (let k = 0; k < size; k++) picked.push(sorted[Math.round((k * (sorted.length - 1)) / (size - 1))]);
  const ids = new Set<string>(); const out: BankQ[] = [];
  for (const q of picked) { if (!ids.has(q.id)) { ids.add(q.id); out.push(q); } }
  for (const q of sorted) { if (out.length >= size) break; if (!ids.has(q.id)) { ids.add(q.id); out.push(q); } }
  return out.sort((a, b) => a.difficulty - b.difficulty).slice(0, size);
}
/** Challenge: questions at or above the student's level, only where the bank really has them. `harderAvailable` tells the screen when it had to fall back. */
export function composeChallenge(pool: BankQ[], masteryBySkill: Map<string, number>, size: number, seen: Set<string>): { picked: BankQ[]; harderAvailable: boolean } {
  const fresh = pool.filter((q) => !seen.has(q.id));
  const harder = fresh.filter((q) => q.difficulty >= Math.min(5, startDifficulty(masteryBySkill.get(q.skill_id) ?? null) + 1));
  const base = harder.length >= size ? harder : fresh;
  const picked = shuffle(base).slice(0, size).sort((a, b) => a.difficulty - b.difficulty);
  return { picked, harderAvailable: harder.length >= size };
}
/** Practice: learning-level questions (the student's own starting difficulty), unseen first. */
export function composePractice(pool: BankQ[], masteryBySkill: Map<string, number>, size: number, seen: Set<string>): BankQ[] {
  const fit = (q: BankQ) => Math.abs(q.difficulty - startDifficulty(masteryBySkill.get(q.skill_id) ?? null));
  const fresh = pool.filter((q) => !seen.has(q.id)); const base = fresh.length >= size ? fresh : pool;
  return shuffle(base).sort((a, b) => fit(a) - fit(b)).slice(0, size);
}
/** Mixed: spread across at least three skills when the pool has them. */
export function composeMixed(pool: BankQ[], size: number, seen: Set<string>): BankQ[] {
  const bySkill = new Map<string, BankQ[]>();
  for (const q of shuffle(pool.filter((q) => !seen.has(q.id)))) { if (!bySkill.has(q.skill_id)) bySkill.set(q.skill_id, []); bySkill.get(q.skill_id)!.push(q); }
  const lists = [...bySkill.values()]; const out: BankQ[] = []; let i = 0;
  while (out.length < size && lists.some((l) => l.length)) { const l = lists[i % lists.length]; if (l.length) out.push(l.shift()!); i++; }
  return out;
}
export function shuffle<T>(xs: T[], rng: () => number = Math.random): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Challenge of the Day: the same question for everyone for a given day and subject, skipping ones this student has already answered. Prefers higher-value, verified questions. */
export function pickDaily(pool: BankQ[], day: string, subjectId: string, answeredBefore: Set<string>): BankQ | null {
  const good = pool.filter((q) => q.difficulty >= 3 || (q.marks ?? 0) >= 2); const base = good.length >= 10 ? good : pool;
  if (!base.length) return null;
  const sorted = [...base].sort((a, b) => (a.id < b.id ? -1 : 1));
  let h = 2166136261; const s = `${day}:${subjectId}`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  for (let k = 0; k < sorted.length; k++) { const q = sorted[(h + k) % sorted.length]; if (!answeredBefore.has(q.id)) return q; }
  return sorted[h % sorted.length];
}
