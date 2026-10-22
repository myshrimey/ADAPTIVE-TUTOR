import type { StudyPlan } from '../planning/study-plan';
import { composeProgramme, READINESS_NOTE, type Programme } from '../planning/premium';

// Two-board view. Dates are the founder's (setting "boards") and are EMPTY until entered; nothing here knows or assumes a date.
// It never predicts marks. It shows readiness the evidence supports for each board window, and says "Insufficient data" otherwise.
export const BOARD_READINESS_LINE = 'Estimated readiness based on Sahayak assessment evidence.';
export { READINESS_NOTE };

export interface BoardsSetting {
  board1_label: string; board1_date: string | null; board1_enabled?: boolean; board1_subjects?: string[] | null;
  board2_label: string; board2_date: string | null; board2_enabled?: boolean; board2_subjects?: string[] | null; programme_name?: string;
}
export interface ReadinessSubject { subjectId: string; slug?: string; name: string; band: string; coveragePercent: number; hasBaseline: boolean; priority: 'start' | 'focus' | 'steady' | 'insufficient'; weakSkillCount: number; mockCount: number; latestMockPercent: number | null }

export interface BoardWindow {
  key: 'board1' | 'board2'; label: string; enabled: boolean; date: string | null; daysLeft: number | null; dateStatus: 'set' | 'not_set' | 'passed';
  subjects: { subjectId: string; name: string; band: string; coveragePercent: number; weakSkillCount: number; focus: string }[];
  summary: string;
}
export interface TwoBoardReadiness { line: string; programmeName: string; board1: BoardWindow; board2: BoardWindow; gapDays: number | null; conflicts: string[]; anyEvidence: boolean }

const daysBetween = (a: Date, b: string) => Math.ceil((new Date(`${b}T00:00:00+05:30`).getTime() - a.getTime()) / 86400000);

function focusText(s: ReadinessSubject, kind: 'board1' | 'board2'): string {
  if (!s.hasBaseline) return 'No diagnostic yet: Insufficient data. Take the diagnostic first.';
  if (kind === 'board1') {
    if (s.priority === 'start') return `Start with the foundations: ${s.weakSkillCount} weak skill${s.weakSkillCount === 1 ? '' : 's'} found.`;
    if (s.priority === 'focus') return `${s.weakSkillCount} skill${s.weakSkillCount === 1 ? '' : 's'} to strengthen before this exam.`;
    if (s.priority === 'steady') return 'Keep revising; evidence so far is steady.';
    return 'Insufficient data: more practice needed to judge.';
  }
  if (s.priority === 'steady') return 'Keep revising and attempt timed papers.';
  if (s.priority === 'insufficient') return 'Insufficient data: more practice needed to judge.';
  return `${s.weakSkillCount} skill${s.weakSkillCount === 1 ? '' : 's'} still weak on the evidence so far: the time between the two exams is for these.`;
}

export function composeTwoBoardReadiness(input: { subjects: ReadinessSubject[]; boards: BoardsSetting; now?: Date }): TwoBoardReadiness {
  const now = input.now ?? new Date(); const b = input.boards;
  const conflicts: string[] = [];
  const window = (key: 'board1' | 'board2'): BoardWindow => {
    const date = key === 'board1' ? b.board1_date : b.board2_date;
    const enabled = (key === 'board1' ? b.board1_enabled : b.board2_enabled) !== false;
    const only = key === 'board1' ? b.board1_subjects : b.board2_subjects;
    const dl = date ? daysBetween(now, date) : null;
    const dateStatus: BoardWindow['dateStatus'] = !date ? 'not_set' : dl! < 0 ? 'passed' : 'set';
    const list = input.subjects.filter((s) => !only || only.includes(s.subjectId) || (s.slug && only.includes(s.slug)));
    if (only && list.length < input.subjects.length) conflicts.push(`${key === 'board1' ? b.board1_label : b.board2_label} covers only the subjects you chose in settings; the others are not shown for it.`);
    const subjects = list.map((s) => ({ subjectId: s.subjectId, name: s.name, band: s.hasBaseline ? s.band : 'insufficient', coveragePercent: s.coveragePercent, weakSkillCount: s.weakSkillCount, focus: focusText(s, key) }));
    const summary = dateStatus === 'not_set' ? 'Exam date not set yet: the founder enters it in settings. Readiness below is still shown from the evidence.' : dateStatus === 'passed' ? 'This date has passed.' : `${dl} day${dl === 1 ? '' : 's'} to go.`;
    return { key, label: key === 'board1' ? b.board1_label : b.board2_label, enabled, date, daysLeft: dl !== null && dl >= 0 ? dl : null, dateStatus, subjects, summary };
  };
  const board1 = window('board1'), board2 = window('board2');
  let gapDays: number | null = null;
  if (b.board1_date && b.board2_date) {
    gapDays = daysBetween(new Date(`${b.board1_date}T00:00:00+05:30`), b.board2_date);
    if (gapDays <= 0) conflicts.push('The second exam date is not after the first. Please check the two dates in settings.');
  }
  return { line: BOARD_READINESS_LINE, programmeName: b.programme_name ?? 'Class X 2027 Two-Board Preparation Programme', board1, board2, gapDays, conflicts, anyEvidence: input.subjects.some((s) => s.hasBaseline) };
}

export interface TwoBoardProgramme { name: string; phase1: Programme | null; phase2: Programme | null; datesComplete: boolean; note: string }
/** Phase 1 = today to Board 1. Phase 2 = Board 1 to Board 2, built again from the weak skills that remain. Without both dates it says so and builds one plan. */
export function composeTwoBoardProgramme(input: { name: string; planBoard1: StudyPlan; planBoard2: StudyPlan | null; boards: BoardsSetting }): TwoBoardProgramme {
  const both = !!(input.boards.board1_date && input.boards.board2_date);
  const phase1 = composeProgramme(input.planBoard1, { datesSet: !!input.boards.board1_date });
  const phase2 = both && input.planBoard2 ? composeProgramme(input.planBoard2, { datesSet: true }) : null;
  return { name: input.name, phase1, phase2, datesComplete: both, note: both ? 'Phase 2 is rebuilt from your evidence after the first exam. It is guidance, not a prediction of marks.' : 'Enter both exam dates in settings to see the second phase. Until then one plan is shown.' };
}
