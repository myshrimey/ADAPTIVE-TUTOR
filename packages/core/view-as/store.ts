import type { SupabaseClient } from '@supabase/supabase-js';
import { buildParentReport } from '../reports/parent-report.service';
import { initials, shortId } from '../accounts/logic';
import { MAX_STARTS_PER_HOUR, type ViewGroup } from './logic';

// v140: SERVER ONLY, server-key client. Everything here only READS ("select"). The target is always re-derived from the target user id
// on the server; no id from the address is ever used to load data.
export async function startsInLastHour(service: SupabaseClient, adminEmail: string, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 3600000).toISOString();
  const { count } = await service.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'account.view_as_start').eq('actor_email', adminEmail).gte('at', since);
  return count ?? 0;
}
export const overLimit = (n: number) => n >= MAX_STARTS_PER_HOUR;

export interface ViewTarget { studentId: string; initials: string; shortId: string; grade: number | null }
/** Only student accounts can be viewed (v140). Returns null for anything else. */
export async function resolveViewTarget(service: SupabaseClient, targetUserId: string): Promise<ViewTarget | null> {
  const { data } = await service.from('students').select('id, display_name, grade').eq('user_id', targetUserId).maybeSingle();
  if (!data) return null;
  return { studentId: (data as any).id, initials: initials((data as any).display_name ?? ''), shortId: shortId(targetUserId), grade: (data as any).grade ?? null };
}

export interface DashboardView { plan: string | null; accessUntil: string | null; subjectLimit: number | null; subjects: string[]; lessons: { at: string; status: string; skill: string; from: number | null; to: number | null }[] }
export interface ProgressView { subjects: { name: string; baseline: number | null; current: number | null; coverage: number; evidence: string; readiness: string; needsPractice: string[]; next: string | null; sessions: number }[] }
export interface ReportView { readiness: { assessed: number; onTrackOrAbove: number; total: number }; gentlerSessions: number; tests: { subject: string; kind: string; at: string; percent: number | null }[] }
export type ViewData = { group: 'dashboard'; data: DashboardView } | { group: 'progress'; data: ProgressView } | { group: 'report'; data: ReportView };

export async function loadViewData(service: SupabaseClient, studentId: string, group: ViewGroup): Promise<ViewData> {
  if (group === 'dashboard') {
    const [acc, goals, sess] = await Promise.all([
      service.from('student_access').select('plan_code, subject_limit, access_until').eq('student_id', studentId).maybeSingle(),
      service.from('learning_goals').select('subject_id, status').eq('student_id', studentId),
      service.from('learning_sessions').select('status, started_at, starting_mastery, ending_mastery, skills(name)').eq('student_id', studentId).order('started_at', { ascending: false }).limit(10),
    ]);
    const ids = ((goals.data as any[]) ?? []).filter((g) => g.status === 'active').map((g) => g.subject_id);
    const subs = ids.length ? ((await service.from('subjects').select('name').in('id', ids)).data as any[]) ?? [] : [];
    const a: any = acc.data;
    return { group, data: { plan: a?.plan_code ?? null, accessUntil: a?.access_until ?? null, subjectLimit: a?.subject_limit ?? null, subjects: subs.map((s) => String(s.name)), lessons: ((sess.data as any[]) ?? []).map((s) => ({ at: s.started_at, status: s.status, skill: s.skills?.name ?? 'Skill', from: s.starting_mastery ?? null, to: s.ending_mastery ?? null })) } };
  }
  const r = await buildParentReport(service, studentId); // read-only; the student's name is dropped below
  if (group === 'progress') return { group, data: { subjects: r.subjects.map((s) => ({ name: s.subjectName, baseline: s.baselineAvgPercent, current: s.currentAvgPercent, coverage: s.coveragePercent, evidence: s.evidence, readiness: String((s.readiness as any)?.band ?? (s.readiness as any)?.label ?? ''), needsPractice: s.needsPractice.slice(0, 8), next: s.nextRecommendedSkillName, sessions: s.sessionsCompleted })) } };
  return { group: 'report', data: { readiness: r.readinessSummary, gentlerSessions: r.gentlerSessions, tests: r.assessmentHistory.slice(0, 30).map((h) => ({ subject: h.subjectName, kind: h.kind, at: h.at, percent: h.percent })) } };
}
