import type { SupabaseClient } from '@supabase/supabase-js';
import { countFamilies, dominantPattern, type ErrorFamily, type ErrorPattern } from './recipes';

/** Recent mistakes (last 90 days) for each student, as counts per family. Server-side only; callers must already have checked the student is theirs to see. */
export async function errorCountsFor(service: SupabaseClient, studentIds: string[], now = Date.now()): Promise<Map<string, Partial<Record<ErrorFamily, number>>>> {
  const out = new Map<string, Partial<Record<ErrorFamily, number>>>();
  if (!studentIds.length) return out;
  const since = new Date(now - 90 * 86400000).toISOString();
  const [mis, ev] = await Promise.all([
    service.from('misconceptions').select('student_id, tag, last_seen_at').in('student_id', studentIds).gte('last_seen_at', since).limit(20000),
    service.from('student_competency_evidence').select('student_id, error_type').in('student_id', studentIds).eq('correct', false).not('error_type', 'is', null).gte('created_at', since).limit(20000),
  ]);
  for (const id of studentIds) {
    const tags = ((mis.data ?? []) as any[]).filter((r) => r.student_id === id).map((r) => r.tag);
    const types = ((ev.data ?? []) as any[]).filter((r) => r.student_id === id).map((r) => r.error_type);
    out.set(id, countFamilies(tags, types));
  }
  return out;
}
export async function errorPatternFor(service: SupabaseClient, studentId: string): Promise<ErrorPattern | null> {
  return dominantPattern((await errorCountsFor(service, [studentId])).get(studentId) ?? {});
}
