import type { SupabaseClient } from '@supabase/supabase-js';

// Enforces the paid plans. Rules:
//   - A student needs a student_access row (the founder grants one, or the one-time
//     migration backfill gave existing students a 'grandfathered' row).
//   - Access ends after access_until (null = no end date). Expired students can still
//     look at their dashboard and reports; they cannot START new learning activity.
//   - subject_limit caps how many subjects they can register. Maths Standard and Maths
//     Basic count as ONE subject.
// Reads use whatever client is passed; student_access has an owner-read RLS policy, so a
// session client sees only the caller's own row.

export type AccessState =
  | { status: 'active'; planCode: string; subjectLimit: number; accessUntil: string | null; daysLeft: number | null }
  | { status: 'expired'; planCode: string; subjectLimit: number; accessUntil: string }
  | { status: 'none' };

export interface AccessRow {
  plan_code: string;
  subject_limit: number;
  access_until: string | null;
}

/** Pure — easy to test. `today` is a YYYY-MM-DD string; access lasts THROUGH access_until. */
export function evaluateAccess(row: AccessRow | null | undefined, today: string): AccessState {
  if (!row) return { status: 'none' };
  if (row.access_until && row.access_until < today) {
    return { status: 'expired', planCode: row.plan_code, subjectLimit: row.subject_limit, accessUntil: row.access_until };
  }
  let daysLeft: number | null = null;
  if (row.access_until) {
    daysLeft = Math.round((Date.parse(row.access_until) - Date.parse(today)) / 86400000);
  }
  return { status: 'active', planCode: row.plan_code, subjectLimit: row.subject_limit, accessUntil: row.access_until, daysLeft };
}

/** Maths Basic/Standard and Hindi Course A/B are one subject each for plan limits. */
export function subjectFamily(slug: string): string {
  if (slug === 'hindi-b') return 'hindi';
  return slug.replace(/-basic$/, '');
}

/** True if registering these slugs on top of the existing ones stays within `limit` subjects. */
export function withinSubjectLimit(existingSlugs: string[], newSlugs: string[], limit: number): boolean {
  const fam = new Set([...existingSlugs, ...newSlugs].map(subjectFamily));
  return fam.size <= limit;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getAccess(supabase: SupabaseClient, studentId: string): Promise<AccessState> {
  const { data } = await supabase.from('student_access').select('plan_code, subject_limit, access_until').eq('student_id', studentId).maybeSingle();
  return evaluateAccess(data as AccessRow | null, todayIso());
}

/** Throws 'access_required' (no plan) or 'access_expired'. Call at the start of any learning activity. */
export async function assertAccess(supabase: SupabaseClient, studentId: string): Promise<Extract<AccessState, { status: 'active' }>> {
  const state = await getAccess(supabase, studentId);
  if (state.status === 'none') throw new Error('access_required');
  if (state.status === 'expired') throw new Error('access_expired');
  return state;
}

/** Throws 'subject_limit_reached' if registering these subject ids would exceed the plan's subject limit. */
export async function assertSubjectAllowed(
  supabase: SupabaseClient,
  studentId: string,
  newSubjectIds: string[],
  limit: number
): Promise<void> {
  const { data: goals } = await supabase.from('learning_goals').select('subject_id, subjects(slug)').eq('student_id', studentId).eq('status', 'active');
  const existing = (goals ?? []).map((g: any) => g.subjects?.slug).filter(Boolean) as string[];
  const { data: subs } = newSubjectIds.length ? await supabase.from('subjects').select('slug').in('id', newSubjectIds) : { data: [] as any[] };
  const incoming = (subs ?? []).map((s: any) => s.slug) as string[];
  if (!withinSubjectLimit(existing, incoming, limit)) throw new Error('subject_limit_reached');
}
