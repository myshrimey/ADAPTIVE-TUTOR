// Worked-example and fading-support engine (master prompt section 12), pure rules, no AI.
// FULL example -> PARTIAL example -> GUIDED -> HINT only -> INDEPENDENT. Support is taken away step by step as the student shows the skill,
// and put back one step when they struggle. The tutor model only phrases the support; this file decides how much of it there is.

export const SCAFFOLD_STAGES = ['full_example', 'partial_example', 'guided', 'hint_only', 'independent'] as const;
export type ScaffoldStage = (typeof SCAFFOLD_STAGES)[number];

export interface ScaffoldInput {
  masteryScore: number; // 0-100 for this skill
  history: { correct: boolean; hints: number }[]; // this session, oldest first
  strategy?: string;
  firstExposure?: boolean;
}

const baseStage = (score: number): number => (score < 30 ? 0 : score < 50 ? 1 : score < 70 ? 2 : score < 85 ? 3 : 4);

export function scaffoldStage(i: ScaffoldInput): ScaffoldStage {
  let s = baseStage(i.masteryScore);
  if (i.firstExposure || (i.history.length === 0 && i.masteryScore < 30)) s = 0;
  const last2 = i.history.slice(-2);
  // Fading: two clean answers in a row (right, no hints) take one step of support away.
  if (last2.length === 2 && last2.every((h) => h.correct && h.hints === 0)) s += 1;
  // Fading back: a wrong answer, or a right one that needed hints, puts one step of support back.
  const last = i.history[history_last(i.history)];
  if (last && (!last.correct || last.hints > 0)) s -= 1;
  // Two wrong in a row: back to a worked example.
  if (last2.length === 2 && last2.every((h) => !h.correct)) s = Math.min(s, 1);
  if (i.strategy === 'PREREQUISITE_REPAIR' || i.strategy === 'REMEDIATION') s = Math.min(Math.max(s, 1), 2);
  if (i.strategy === 'INDEPENDENT_TEST') s = 4;
  if (i.strategy === 'CHALLENGE') s = Math.max(s, 3);
  return SCAFFOLD_STAGES[Math.max(0, Math.min(4, s))];
}
const history_last = (h: unknown[]) => h.length - 1;

export const SCAFFOLD_NOTE: Record<ScaffoldStage, string> = {
  full_example: 'Support level 1 of 5: show ONE complete worked example, every step explained in simple words, then ask a very similar question.',
  partial_example: 'Support level 2 of 5: show a worked example with one or two steps left blank for the student to fill in.',
  guided: 'Support level 3 of 5: let the student do the steps, but ask a small question about the first step before they answer.',
  hint_only: 'Support level 4 of 5: let the student try alone first; give only a small hint, and only if they ask or get it wrong.',
  independent: 'Support level 5 of 5: no support unless the student asks; do not give hints or steps.',
};
export const scaffoldNote = (i: ScaffoldInput): string => SCAFFOLD_NOTE[scaffoldStage(i)];
