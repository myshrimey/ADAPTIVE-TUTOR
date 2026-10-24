// v63: Challenge zone (stretch tier). Pure rules, no database. A student who has shown strong command of a Class 10 skill may
// try harder questions written "in the style of" olympiad / NTSE / foundation-level exams. Practice and motivation only:
// stretch answers never change mastery, readiness or any mark, and badges carry no XP, money or discount.
export const STRETCH_STYLES = ['olympiad', 'ntse', 'ioqm', 'jee_foundation', 'neet_foundation', 'general_challenge'] as const;
export type StretchStyle = (typeof STRETCH_STYLES)[number];
export const STYLE_LABEL: Record<StretchStyle, string> = {
  olympiad: 'Olympiad style', ntse: 'NTSE style', ioqm: 'Maths Olympiad (IOQM) style',
  jee_foundation: 'JEE-foundation style', neet_foundation: 'NEET-foundation style', general_challenge: 'General challenge',
};
export const STYLE_NOTE = 'Original questions written in the style of these exams. They are not copies of any real paper and not an official preparation for any exam.';
export const isStretchStyle = (s: unknown): s is StretchStyle => typeof s === 'string' && (STRETCH_STYLES as readonly string[]).includes(s);
export const LEVEL_LABEL: Record<number, string> = { 1: 'Stretch 1 · Bridge', 2: 'Stretch 2 · Challenge', 3: 'Stretch 3 · Summit' };

export interface StretchSettings { enabled: boolean; allowUnreviewed: boolean; unlockScore: number; levelUpAfter: number; levelDownAfter: number; dailyLimit: number }
export const DEFAULT_STRETCH_SETTINGS: StretchSettings = { enabled: true, allowUnreviewed: true, unlockScore: 75, levelUpAfter: 3, levelDownAfter: 2, dailyLimit: 30 };
export function cleanStretchSettings(raw: any): StretchSettings {
  const d = DEFAULT_STRETCH_SETTINGS;
  const n = (v: any, lo: number, hi: number, def: number) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x) : def; };
  return { enabled: raw?.enabled === false ? false : true, allowUnreviewed: raw?.allowUnreviewed === false ? false : true, unlockScore: n(raw?.unlockScore, 50, 100, d.unlockScore), levelUpAfter: n(raw?.levelUpAfter, 2, 10, d.levelUpAfter), levelDownAfter: n(raw?.levelDownAfter, 1, 10, d.levelDownAfter), dailyLimit: n(raw?.dailyLimit, 5, 200, d.dailyLimit) };
}

/** A skill opens in the Challenge zone only on real evidence of strength: mastery score at the threshold, or a demonstrated competency with 2+ pieces of evidence. */
export function isSkillUnlocked(o: { masteryScore?: number | null; competencyStatus?: string | null; evidenceCount?: number | null }, unlockScore = DEFAULT_STRETCH_SETTINGS.unlockScore): boolean {
  if (o.masteryScore != null && Number(o.masteryScore) >= unlockScore) return true;
  return o.competencyStatus === 'demonstrated' && Number(o.evidenceCount ?? 0) >= 2;
}

export interface StretchRecord { correct: boolean; level: number }
/** Next level from the most recent answers (oldest first): up after N correct in a row, down after M wrong in a row, otherwise stay. Range 1-3. */
export function nextStretchLevel(current: number, recent: boolean[], s: Pick<StretchSettings, 'levelUpAfter' | 'levelDownAfter'> = DEFAULT_STRETCH_SETTINGS): number {
  const cur = Math.min(3, Math.max(1, Math.round(current) || 1));
  let up = 0; for (let i = recent.length - 1; i >= 0 && recent[i]; i--) up++;
  let down = 0; for (let i = recent.length - 1; i >= 0 && !recent[i]; i--) down++;
  if (up >= s.levelUpAfter) return Math.min(3, cur + 1);
  if (down >= s.levelDownAfter) return Math.max(1, cur - 1);
  return cur;
}
/** After a level change the streak window restarts, so a run is counted only at one level. */
export function trailingRun(recent: boolean[]): { right: number; wrong: number } {
  let right = 0, wrong = 0;
  for (let i = recent.length - 1; i >= 0 && recent[i]; i--) right++;
  for (let i = recent.length - 1; i >= 0 && !recent[i]; i--) wrong++;
  return { right, wrong };
}
export function bestRun(answers: boolean[]): number { let best = 0, cur = 0; for (const a of answers) { cur = a ? cur + 1 : 0; best = Math.max(best, cur); } return best; }

export interface StretchMetrics { stretch_correct: number; stretch_best_run: number; stretch_level3: number; stretch_styles: number; stretch_subjects: number }
export const EMPTY_STRETCH_METRICS: StretchMetrics = { stretch_correct: 0, stretch_best_run: 0, stretch_level3: 0, stretch_styles: 0, stretch_subjects: 0 };
/** Rows oldest first. Each question counts once (the database enforces it), so repeats cannot inflate a badge. */
export function stretchMetrics(rows: Array<{ correct: boolean; stretch_level: number | null; exam_style: string | null; subject_id: string | null }>): StretchMetrics {
  const right = rows.filter((r) => r.correct);
  return {
    stretch_correct: right.length,
    stretch_best_run: bestRun(rows.map((r) => r.correct)),
    stretch_level3: right.filter((r) => r.stretch_level === 3).length,
    stretch_styles: new Set(right.map((r) => r.exam_style).filter(Boolean)).size,
    stretch_subjects: new Set(right.map((r) => r.subject_id).filter(Boolean)).size,
  };
}

/** Wording after an answer. A miss is framed as normal: these are meant to be very hard. Never a label for the child. */
export function stretchFeedbackLine(correct: boolean, level: number, lang: 'en' | 'hi' = 'en'): string {
  if (lang === 'hi') return correct ? 'शाबाश! यह सवाल कठिन था।' : 'ये सवाल बहुत कठिन होते हैं — हल देखिए और अगला आज़माइए।';
  return correct ? (level >= 3 ? 'Excellent. That was a summit-level question.' : 'Well done. That was a hard one.') : 'These questions are meant to be very hard. Read the solution, then try the next one.';
}
export const STRETCH_BANNED = ['genius', 'gifted', 'prodigy', 'topper', 'rank', 'guaranteed', 'will crack', 'will score'];

/** Level for one skill from its answers (oldest first). Starts at 1; each level change restarts the run window. */
export function deriveLevel(answers: boolean[], s: Pick<StretchSettings, 'levelUpAfter' | 'levelDownAfter'> = DEFAULT_STRETCH_SETTINGS): number {
  let level = 1; let win: boolean[] = [];
  for (const a of answers) { win.push(a); const nl = nextStretchLevel(level, win, s); if (nl !== level) { level = nl; win = []; } }
  return level;
}
