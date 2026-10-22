import type { EngagementSettings } from './config';

// Today's Mission: small, achievable, built from the student's own evidence. No AI. Deterministic for a given day and evidence.
export type MissionKind = 'diagnostic' | 'mistakes' | 'weakness' | 'subject_practice' | 'beat_best' | 'daily' | 'questions';
export interface MissionItemPlan { kind: MissionKind; label: string; target: number; subjectId?: string; skillId?: string; href: string; category?: string }
export interface MissionInput {
  hasDiagnostic: boolean;
  openMistakes: number;
  calculationMistakes: number;
  weakSkills: { skillId: string; name: string; chapterName: string; subjectId: string; subjectName: string; score: number }[]; // weakest first
  subjects: { id: string; name: string; daysSincePractice: number | null }[];
  recentImprovement: { subjectId: string; name: string } | null;
  dailyAvailable: boolean;
  settings: EngagementSettings;
}
export interface MissionPlan { title: string; items: MissionItemPlan[] }
export const NEGLECT_DAYS = 4;

export function composeMission(i: MissionInput): MissionPlan {
  const max = Math.max(1, Math.min(i.settings.mission.items, i.settings.mission.max_items));
  const items: MissionItemPlan[] = [];
  const add = (x: MissionItemPlan) => { if (items.length < max && !items.some((y) => y.kind === x.kind && (x.kind !== 'subject_practice' || y.subjectId === x.subjectId))) items.push(x); };
  let title = 'Your next step';

  if (!i.hasDiagnostic) {
    add({ kind: 'diagnostic', label: 'Take your first diagnostic test', target: 1, href: '/diagnostic' });
    if (i.dailyAvailable) add({ kind: 'daily', label: "Try today's CBSE Challenge of the Day", target: 1, href: '/challenge/daily' });
    return { title: 'Your first steps', items };
  }
  if (i.calculationMistakes >= 3) { add({ kind: 'mistakes', label: 'Fix 5 calculation mistakes', target: Math.min(5, i.calculationMistakes), category: 'calculation', href: '/mistakes/review?category=calculation' }); title = 'Fix calculation mistakes'; }
  else if (i.openMistakes >= 3) { add({ kind: 'mistakes', label: 'Review 3 mistakes', target: 3, href: '/mistakes/review' }); }
  const w = i.weakSkills[0];
  if (w) { add({ kind: 'weakness', label: `Repair ${w.chapterName || w.name}`, target: 1, subjectId: w.subjectId, skillId: w.skillId, href: `/battle?skill=${w.skillId}` }); if (title === 'Your next step') title = `Repair ${w.chapterName || w.name}`; }
  const neglected = [...i.subjects].filter((s) => s.daysSincePractice === null || s.daysSincePractice >= NEGLECT_DAYS).sort((a, b) => (b.daysSincePractice ?? 999) - (a.daysSincePractice ?? 999))[0];
  if (neglected) { add({ kind: 'subject_practice', label: `10-minute ${neglected.name} challenge`, target: 1, subjectId: neglected.id, href: `/challenge/start?mode=practice&subject=${neglected.id}` }); if (title === 'Your next step') title = `10-minute ${neglected.name} challenge`; }
  if (i.recentImprovement) { add({ kind: 'beat_best', label: 'Beat your previous best', target: 1, subjectId: i.recentImprovement.subjectId, href: `/challenge/start?mode=challenge&subject=${i.recentImprovement.subjectId}` }); if (title === 'Your next step') title = 'Beat your previous best'; }
  if (i.dailyAvailable) add({ kind: 'daily', label: "Try today's CBSE Challenge of the Day", target: 1, href: '/challenge/daily' });
  add({ kind: 'questions', label: `Answer ${i.settings.mission.questions_target} questions`, target: i.settings.mission.questions_target, href: '/learn' });
  return { title, items };
}

export interface MissionEvidence {
  questionsToday: number; diagnosticToday: boolean; mistakesReviewedToday: number; reviewedByCategory: Record<string, number>;
  weaknessDoneToday: Set<string>; practiceSubjectsToday: Set<string>; challengeDoneToday: boolean; dailyDoneToday: boolean;
}
export function itemProgress(it: { kind: MissionKind; target: number; skillId?: string | null; subjectId?: string | null; category?: string | null }, e: MissionEvidence): number {
  let p = 0;
  switch (it.kind) {
    case 'diagnostic': p = e.diagnosticToday ? 1 : 0; break;
    case 'mistakes': p = it.category ? e.reviewedByCategory[it.category] ?? 0 : e.mistakesReviewedToday; break;
    case 'weakness': p = it.skillId && e.weaknessDoneToday.has(it.skillId) ? 1 : 0; break;
    case 'subject_practice': p = it.subjectId && e.practiceSubjectsToday.has(it.subjectId) ? 1 : 0; break;
    case 'beat_best': p = e.challengeDoneToday ? 1 : 0; break;
    case 'daily': p = e.dailyDoneToday ? 1 : 0; break;
    case 'questions': p = e.questionsToday; break;
  }
  return Math.min(it.target, p);
}
