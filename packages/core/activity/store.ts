import type { SupabaseClient } from '@supabase/supabase-js';
import { ACTIVITY_TYPES, cleanMeta, isActivityType, type ActivityStatus, type ActivityType, type TimelineFilter } from './logic';

// v138: SERVER ONLY (server-key client). recordActivity never throws and never blocks a product flow.
const missing = (err: any) => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(String(err.message ?? '')));

export interface ActivityInput { userId: string | null; type: ActivityType; role?: string | null; status?: ActivityStatus; entity?: string | null; entityId?: string | null; meta?: Record<string, unknown>; correlationId?: string | null }

export async function recordActivity(service: SupabaseClient, ev: ActivityInput): Promise<boolean> {
  try {
    if (!isActivityType(ev.type)) return false;
    const { error } = await service.from('activity_events').insert({
      user_id: ev.userId, actor_role: ev.role ? String(ev.role).slice(0, 30) : null, category: ACTIVITY_TYPES[ev.type], event_type: ev.type,
      entity: ev.entity ? String(ev.entity).slice(0, 40) : null, entity_id: ev.entityId ? String(ev.entityId).slice(0, 60) : null,
      status: ev.status ?? 'ok', meta: cleanMeta(ev.meta), correlation_id: ev.correlationId ? String(ev.correlationId).slice(0, 60) : null,
    });
    return !error; // before migration 0068 the table is missing: the event is simply not kept
  } catch { return false; }
}

/** For routes that know the student but not the login row. */
export async function recordActivityForStudent(service: SupabaseClient, studentId: string, ev: Omit<ActivityInput, 'userId'>): Promise<boolean> {
  try {
    const { data } = await service.from('students').select('user_id').eq('id', studentId).maybeSingle();
    return recordActivity(service, { ...ev, userId: (data as any)?.user_id ?? null });
  } catch { return false; }
}

export interface TimelineRow { id: string; at: string; category: string; type: string; status: string; entity: string | null; meta: Record<string, unknown> }
/** null = the table does not exist yet (run migration 0068). */
export async function loadTimeline(service: SupabaseClient, userId: string, f: TimelineFilter): Promise<TimelineRow[] | null> {
  let q: any = service.from('activity_events').select('id, occurred_at, category, event_type, status, entity, meta').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(f.limit);
  if (f.from) q = q.gte('occurred_at', f.from + 'T00:00:00Z');
  if (f.to) q = q.lte('occurred_at', f.to + 'T23:59:59Z');
  if (f.category) q = q.eq('category', f.category);
  if (f.type) q = q.eq('event_type', f.type);
  const { data, error } = await q;
  if (error) return missing(error) ? null : [];
  return (data ?? []).map((r: any) => ({ id: r.id, at: r.occurred_at, category: r.category, type: r.event_type, status: r.status, entity: r.entity ?? null, meta: r.meta ?? {} }));
}
