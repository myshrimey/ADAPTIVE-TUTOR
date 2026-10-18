// Dynamic study plan (master prompt v3, sec. 28).
//
// Rule-based and built only from recorded evidence: which subjects have a baseline, which skills are
// weak, which weak skills sit on top of a weaker prerequisite, how many mocks were taken, how many
// days are left and how much time the student said they have. No AI, no invented numbers. It is
// recalculated every time the page opens, so it moves with the child: weak skills that improve drop
// off, a new weak skill appears, a prerequisite gap is repaired first.
//
// The board exam date is a PLANNING assumption (CBSE publishes the date sheet later). Change it in
// one place: BOARD_EXAM_START.

import type { SupabaseClient } from '@supabase/supabase-js';

/** Planning date for the start of the CBSE Class 10 board exams, 2027. Update when CBSE publishes the date sheet. */
export const BOARD_EXAM_START = '2027-02-17';
export const DEFAULT_DAILY_MINUTES = 45;
const WEAK_BELOW = 50; // mastery score (percent) below which a skill is treated as weak
const MAX_WEAK_PER_SUBJECT = 3;

export type PlanPhase = 'build' | 'strengthen' | 'revise';
export type PlanStepKind = 'diagnostic' | 'repair_prerequisite' | 'practise_weak' | 'cover_new' | 'mock' | 'timed_practice' | 'keep_going';

export interface PlanStep {
  kind: PlanStepKind;
  text: string;
  skillId?: string;
}

export interface WeakSkill {
  skillId: string;
  name: string;
  score: number;
  /** Prerequisites of this skill that are assessed and weak (weaker first). */
  weakPrerequisites: { skillId: string; name: string; score: number }[];
}

export interface PlanSubjectInput {
  subjectId: string;
  name: string;
  priority: 'start' | 'focus' | 'steady' | 'insufficient';
  hasBaseline: boolean;
  coveragePercent: number;
  mockCount: number;
  weakSkills: WeakSkill[];
}

export interface PlanInput {
  today: Date;
  examStart?: string;
  dailyMinutes: number | null;
  subjects: PlanSubjectInput[];
  sessionsLast14Days: number;
}

export interface PlanSubject {
  subjectId: string;
  name: string;
  minutesPerWeek: number;
  steps: PlanStep[];
}

export interface StudyPlan {
  daysLeft: number;
  weeksLeft: number;
  phase: PlanPhase;
  weeklyMinutes: number;
  usingDefaultMinutes: boolean;
  examStart: string;
  subjects: PlanSubject[];
  notes: string[];
}

const WEIGHT: Record<PlanSubjectInput['priority'], number> = { start: 3, focus: 2, insufficient: 2, steady: 1 };

export function phaseForDaysLeft(daysLeft: number): PlanPhase {
  if (daysLeft > 90) return 'build';
  if (daysLeft > 30) return 'strengthen';
  return 'revise';
}

export function composeStudyPlan(input: PlanInput): StudyPlan {
  const examStart = input.examStart ?? BOARD_EXAM_START;
  const daysLeft = Math.max(0, Math.ceil((new Date(examStart + 'T00:00:00+05:30').getTime() - input.today.getTime()) / 86400000));
  const phase = phaseForDaysLeft(daysLeft);
  const usingDefaultMinutes = input.dailyMinutes === null;
  const dailyMinutes = input.dailyMinutes ?? DEFAULT_DAILY_MINUTES;
  const weeklyMinutes = dailyMinutes * 5; // five study days a week; two are left free on purpose
  const notes: string[] = [];

  if (input.sessionsLast14Days === 0) {
    notes.push('No practice was recorded in the last 14 days. Start with short sessions of 15–20 minutes and build back up; a plan that is followed beats a perfect plan.');
  }
  if (phase === 'revise') notes.push('Under 30 days to go: the plan now favours timed practice and revising weak skills over new topics.');
  if (usingDefaultMinutes) notes.push(`Daily study time was not set, so ${DEFAULT_DAILY_MINUTES} minutes a day is assumed. Set your own time in the profile.`);

  const totalWeight = input.subjects.reduce((s, x) => s + WEIGHT[x.priority], 0) || 1;
  const subjects: PlanSubject[] = input.subjects.map((s) => {
    const steps: PlanStep[] = [];
    if (!s.hasBaseline) {
      steps.push({ kind: 'diagnostic', text: `Take the ${s.name} diagnostic. Until then, Sahayak has no evidence to plan from.` });
    }
    for (const w of s.weakSkills.slice(0, MAX_WEAK_PER_SUBJECT)) {
      // A weak skill that stands on a weak prerequisite: repair the prerequisite first.
      const pre = w.weakPrerequisites[0];
      if (pre) {
        steps.push({ kind: 'repair_prerequisite', skillId: pre.skillId, text: `Repair first: ${pre.name} (${Math.round(pre.score)}%). It sits underneath ${w.name}.` });
      }
      steps.push({ kind: 'practise_weak', skillId: w.skillId, text: `Practise ${w.name} (${Math.round(w.score)}% now).` });
    }
    if (s.hasBaseline && s.weakSkills.length === 0 && s.coveragePercent < 100) {
      steps.push({ kind: 'cover_new', text: `No weak skills found so far, but only ${Math.round(s.coveragePercent)}% of ${s.name} has been assessed. Do a chapter check on a chapter not yet covered.` });
    }
    if (phase !== 'build' && s.hasBaseline && s.mockCount === 0 && s.coveragePercent >= 40) {
      steps.push({ kind: 'mock', text: `Take a timed ${s.name} mock. No mock is recorded yet, and timed work is part of board readiness.` });
    }
    if (phase === 'revise' && s.hasBaseline) {
      steps.push({ kind: 'timed_practice', text: `Do timed ${s.name} practice twice a week and review every mistake.` });
    }
    if (steps.length === 0) steps.push({ kind: 'keep_going', text: `Keep the ${s.name} routine going. Nothing weak is showing in the evidence collected so far.` });
    return {
      subjectId: s.subjectId,
      name: s.name,
      minutesPerWeek: Math.round((weeklyMinutes * WEIGHT[s.priority]) / totalWeight / 5) * 5,
      steps,
    };
  });

  return { daysLeft, weeksLeft: Math.ceil(daysLeft / 7), phase, weeklyMinutes, usingDefaultMinutes, examStart, subjects, notes };
}

/** Load weak skills (with weak prerequisites) per subject for one student. Uses the session-bound client (RLS). */
export async function loadWeakSkills(supabase: SupabaseClient, studentId: string): Promise<Map<string, WeakSkill[]>> {
  const [{ data: mastery }, { data: prereqs }] = await Promise.all([
    supabase
      .from('mastery_states')
      .select('skill_id, score, skills(name, retired, topics(chapters(subject_id)))')
      .eq('student_id', studentId),
    supabase.from('prerequisites').select('skill_id, requires_skill_id, strength'),
  ]);
  const byId = new Map<string, { name: string; score: number; subjectId: string | null }>();
  for (const m of (mastery ?? []) as any[]) {
    if (m.skills?.retired) continue;
    byId.set(m.skill_id, { name: m.skills?.name ?? 'a skill', score: Number(m.score), subjectId: m.skills?.topics?.chapters?.subject_id ?? null });
  }
  const reqs = new Map<string, string[]>();
  for (const p of (prereqs ?? []) as any[]) {
    if (p.strength && p.strength !== 'hard') continue;
    reqs.set(p.skill_id, [...(reqs.get(p.skill_id) ?? []), p.requires_skill_id]);
  }
  const out = new Map<string, WeakSkill[]>();
  for (const [skillId, m] of byId) {
    if (!m.subjectId || m.score >= WEAK_BELOW) continue;
    const weakPrerequisites = (reqs.get(skillId) ?? [])
      .map((rid) => ({ rid, p: byId.get(rid) }))
      .filter((x): x is { rid: string; p: { name: string; score: number; subjectId: string | null } } => !!x.p && x.p.score < WEAK_BELOW)
      .map((x) => ({ skillId: x.rid, name: x.p.name, score: x.p.score }))
      .sort((a, b) => a.score - b.score);
    out.set(m.subjectId, [...(out.get(m.subjectId) ?? []), { skillId, name: m.name, score: m.score, weakPrerequisites }]);
  }
  for (const [k, list] of out) out.set(k, list.sort((a, b) => a.score - b.score));
  return out;
}
