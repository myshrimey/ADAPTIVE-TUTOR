import type { SupabaseClient } from '@supabase/supabase-js';
import { compareBest, type BestKind, type BestResult } from './personal-best';
import type { EngagementSettings } from './config';
import { awardXp, logEngagementEvent } from './store';

/** Compares a value with the student's stored best for (kind, scope). Stores a new best and pays the personal-best XP once per new value. */
export async function recordBest(service: SupabaseClient, studentId: string, kind: BestKind, scopeId: string, value: number, settings: EngagementSettings, unit = '%'): Promise<BestResult> {
  const { data: ex } = await service.from('personal_bests').select('id, value').eq('student_id', studentId).eq('kind', kind).eq('scope_id', scopeId).maybeSingle();
  const prev = ex ? Number(ex.value) : null;
  const r = compareBest(prev, value, unit);
  if (r.kind === 'first') {
    await service.from('personal_bests').insert({ student_id: studentId, kind, scope_id: scopeId, value }).then(() => undefined, () => undefined);
  } else if (r.kind === 'new_best') {
    await service.from('personal_bests').update({ value, previous_value: prev, achieved_at: new Date().toISOString() }).eq('id', ex!.id);
    await logEngagementEvent(service, studentId, 'personal_best', `${kind}:${scopeId}:${value}`, { kind, scopeId, previous: prev, value });
    if (settings.features.xp) await awardXp(service, studentId, { amount: settings.xp.personal_best, kind: 'personal_best', ref: `pb:${kind}:${scopeId}:${value}`, note: kind });
  }
  return r;
}
export async function loadBests(service: SupabaseClient, studentId: string): Promise<{ kind: string; scopeId: string; value: number; previous: number | null; achievedAt: string }[]> {
  const { data } = await service.from('personal_bests').select('kind, scope_id, value, previous_value, achieved_at').eq('student_id', studentId).order('achieved_at', { ascending: false }).limit(100);
  return ((data ?? []) as any[]).map((r) => ({ kind: r.kind, scopeId: r.scope_id, value: Number(r.value), previous: r.previous_value === null ? null : Number(r.previous_value), achievedAt: r.achieved_at }));
}
