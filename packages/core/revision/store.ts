import type { SupabaseClient } from '@supabase/supabase-js';
import { foldEvidence, buildReviewPlan, istDayStr, type ReviewState, type ReviewPlan, type EvidenceRow } from './schedule';

const toRow = (studentId: string, competencyId: string, s: ReviewState) => ({
  student_id: studentId, competency_id: competencyId, rung: s.rung, interval_days: s.intervalDays, reps: s.reps, lapses: s.lapses, due_on: s.dueOn, last_day: s.lastDay,
  last_result: s.lastResult, last_evidence_at: s.lastEvidenceAt, updated_at: new Date().toISOString(),
});
const fromRow = (r: any): ReviewState => ({ rung: r.rung, intervalDays: r.interval_days, reps: r.reps, lapses: r.lapses, dueOn: r.due_on, lastDay: r.last_day, lastResult: r.last_result, lastEvidenceAt: r.last_evidence_at });

/** Brings the schedule up to date from the student's answers. Safe to run any number of times. */
export async function syncReviewSchedule(service: SupabaseClient, studentId: string, examDate?: string | null): Promise<{ updated: number; error?: string }> {
  const { data: ev, error } = await service.from('student_competency_evidence').select('competency_id, correct, hint_used, created_at').eq('student_id', studentId).order('created_at', { ascending: true }).limit(5000);
  if (error) return { updated: 0, error: error.message };
  const { data: existing } = await service.from('review_schedule').select('*').eq('student_id', studentId).limit(5000);
  const have = new Map<string, ReviewState>(((existing ?? []) as any[]).map((r) => [r.competency_id, fromRow(r)]));
  const by = new Map<string, EvidenceRow[]>();
  for (const r of (ev ?? []) as any[]) { const a = by.get(r.competency_id) ?? []; a.push({ at: r.created_at, correct: !!r.correct, hint: !!r.hint_used }); by.set(r.competency_id, a); }
  const today = istDayStr(Date.now()); let updated = 0;
  for (const [cid, rows] of by) {
    const prev = have.get(cid) ?? null;
    const next = foldEvidence(prev, rows, examDate, today);
    if (!next || (prev && JSON.stringify(prev) === JSON.stringify(next))) continue;
    const { error: e2 } = await service.from('review_schedule').upsert(toRow(studentId, cid, next), { onConflict: 'student_id,competency_id' });
    if (e2) return { updated, error: e2.message };
    updated++;
  }
  return { updated };
}

export async function loadReviewPlan(service: SupabaseClient, studentId: string, examDate?: string | null): Promise<ReviewPlan & { error?: string }> {
  const sync = await syncReviewSchedule(service, studentId, examDate);
  const { data: rows } = await service.from('review_schedule').select('*, competencies(name, chapter, skill_id, importance)').eq('student_id', studentId).limit(5000);
  const ids = ((rows ?? []) as any[]).map((r) => r.competency_id);
  const mastery = new Map<string, number>();
  if (ids.length) { const { data: m } = await service.from('student_competency_mastery').select('competency_id, mastery').eq('student_id', studentId).in('competency_id', ids); for (const x of (m ?? []) as any[]) mastery.set(x.competency_id, Number(x.mastery)); }
  const states = ((rows ?? []) as any[]).map((r) => ({ ...fromRow(r), competencyId: r.competency_id, name: r.competencies?.name ?? 'Skill', chapter: r.competencies?.chapter ?? null, skillId: r.competencies?.skill_id ?? null, importance: r.competencies?.importance ?? 3, mastery: mastery.get(r.competency_id) ?? null }));
  const plan = buildReviewPlan({ states, today: istDayStr(Date.now()), examDate });
  return sync.error ? { ...plan, error: sync.error } : plan;
}
