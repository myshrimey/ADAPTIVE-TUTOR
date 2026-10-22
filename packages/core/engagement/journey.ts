// Study journey for one subject, from recorded evidence only. "Board readiness" is never declared reached; it points to the readiness page.
export type StageKey = 'diagnostic' | 'foundation' | 'concept_mastery' | 'practice' | 'weakness_repair' | 'chapter_mastery' | 'mock' | 'reassessment' | 'board_readiness';
export const STAGES: { key: StageKey; label: string }[] = [
  { key: 'diagnostic', label: 'Diagnostic' }, { key: 'foundation', label: 'Foundation' }, { key: 'concept_mastery', label: 'Concept mastery' }, { key: 'practice', label: 'Practice' },
  { key: 'weakness_repair', label: 'Weakness repair' }, { key: 'chapter_mastery', label: 'Chapter mastery' }, { key: 'mock', label: 'Mock' }, { key: 'reassessment', label: 'Reassessment' }, { key: 'board_readiness', label: 'Board readiness' },
];
export interface JourneyInput {
  diagnosticsCompleted: number;
  skills: { score: number }[];           // skills of this subject the student has a mastery score for
  totalSkills: number;                   // skills in the subject
  questionsAnswered: number;            // practice answers in this subject
  weaknessBattlesDone: number;
  chaptersMastered: number;
  mocksDone: number;
}
export const PRACTICE_TARGET = 30;
export interface JourneyStage { key: StageKey; label: string; status: 'done' | 'current' | 'upcoming'; note: string }
export interface Journey { stages: JourneyStage[]; current: StageKey; next: { text: string; href: string } }

export function computeJourney(i: JourneyInput, subjectId: string): Journey {
  const touched = i.skills.length, low = i.skills.filter((s) => s.score < 40).length, weak = i.skills.filter((s) => s.score < 60).length;
  const developing = i.skills.filter((s) => s.score >= 60).length;
  const done: Record<StageKey, boolean> = {
    diagnostic: i.diagnosticsCompleted >= 1,
    foundation: i.diagnosticsCompleted >= 1 && touched > 0 && low === 0,
    concept_mastery: touched > 0 && i.totalSkills > 0 && developing / i.totalSkills >= 0.6,
    practice: i.questionsAnswered >= PRACTICE_TARGET,
    weakness_repair: i.diagnosticsCompleted >= 1 && touched > 0 && weak === 0 && (i.weaknessBattlesDone >= 1 || low === 0),
    chapter_mastery: i.chaptersMastered >= 1,
    mock: i.mocksDone >= 1,
    reassessment: i.diagnosticsCompleted >= 2,
    board_readiness: false,
  };
  const note: Record<StageKey, string> = {
    diagnostic: done.diagnostic ? 'Done' : 'Take the diagnostic to see where you are.',
    foundation: done.foundation ? 'No skill needs foundation work right now.' : `${low} skill${low === 1 ? '' : 's'} need foundation work.`,
    concept_mastery: `${developing} of ${i.totalSkills || '?'} skills at Developing or above (aim: 60% of the subject).`,
    practice: `${Math.min(i.questionsAnswered, PRACTICE_TARGET)} of ${PRACTICE_TARGET} practice questions.`,
    weakness_repair: done.weakness_repair ? 'No weak skills on the evidence so far.' : `${weak} skill${weak === 1 ? '' : 's'} still below Developing.`,
    chapter_mastery: i.chaptersMastered ? `${i.chaptersMastered} chapter${i.chaptersMastered === 1 ? '' : 's'} mastered.` : 'No chapter mastered yet.',
    mock: done.mock ? `${i.mocksDone} mock${i.mocksDone === 1 ? '' : 's'} done.` : 'No mock yet.',
    reassessment: done.reassessment ? 'Re-checked after the first diagnostic.' : 'A second check shows how far you have come.',
    board_readiness: 'Ongoing. It needs mock and re-check evidence; see your readiness page.',
  };
  let cur: StageKey | null = null;
  const stages: JourneyStage[] = STAGES.map((s) => {
    let status: JourneyStage['status'] = 'upcoming';
    if (done[s.key]) status = 'done'; else if (!cur) { cur = s.key; status = 'current'; }
    return { key: s.key, label: s.label, status, note: note[s.key] };
  });
  const current: StageKey = cur ?? 'board_readiness';
  const nextByStage: Record<StageKey, { text: string; href: string }> = {
    diagnostic: { text: 'Take the diagnostic test for this subject.', href: '/diagnostic' },
    foundation: { text: 'Repair your foundation skills with a Weakness Battle.', href: `/battle?subject=${subjectId}` },
    concept_mastery: { text: 'Keep learning: open a lesson on your next skill.', href: '/learn' },
    practice: { text: 'Answer a few practice questions today.', href: `/challenge/start?mode=practice&subject=${subjectId}` },
    weakness_repair: { text: 'Start a Weakness Battle on your weakest skill.', href: `/battle?subject=${subjectId}` },
    chapter_mastery: { text: 'Pick a chapter and practise until each skill is Strong.', href: `/challenge/start?mode=mixed&subject=${subjectId}` },
    mock: { text: 'Try a mock test.', href: '/mock' },
    reassessment: { text: 'Take the diagnostic again to see your improvement.', href: '/diagnostic' },
    board_readiness: { text: 'See your board readiness.', href: '/board-readiness' },
  };
  return { stages, current, next: nextByStage[current] };
}
