import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSettings } from './commerce.service';

// What a student may use. The founder decides in /admin/pricing (setting "entitlements") which features need a paid plan.
// Free founding access keeps the learning features; the detailed readiness / programme / rescue products need a paid plan.

export const FEATURES = [
  'basic_diagnostic', 'advanced_diagnostic', 'adaptive_learning', 'basic_assessment', 'advanced_assessment', 'basic_parent_report', 'advanced_parent_report',
  'voice_interactions', 'visual_interactions', 'board_readiness', 'handwritten_mock', 'handwritten_mock_credits', 'board_preparation_programme', 'exam_rescue', 'advanced_analytics',
] as const;
export type Feature = (typeof FEATURES)[number];

export function isPaidAccess(acc: { plan_code?: string | null; access_until?: string | null } | null, on: string = new Date().toISOString().slice(0, 10)): boolean {
  if (!acc || !acc.plan_code || acc.plan_code === 'free') return false;
  return !acc.access_until || acc.access_until >= on;
}

/** Pure rule: a feature is open when enforcement is off, when it is not on the paid list, or when the student has a paid, unexpired plan. */
export function featureOpen(feature: string, paid: boolean, ent: { enforce: boolean; paid_features: string[] }): boolean {
  if (!ent.enforce) return true;
  if (!ent.paid_features.includes(feature)) return true;
  return paid;
}

export async function hasFeature(service: SupabaseClient, studentId: string, feature: Feature): Promise<boolean> {
  const [settings, { data: acc }] = await Promise.all([loadSettings(service), service.from('student_access').select('plan_code, access_until').eq('student_id', studentId).maybeSingle()]);
  return featureOpen(feature, isPaidAccess(acc), settings.entitlements);
}

// ---- Daily use of limited features (voice read-aloud etc.) ----
export function usageDecision(used: number, limit: number): { allowed: boolean; remaining: number } {
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

/** Counts one use and says whether it was allowed. Paid plans are not limited here. Never throws (a failure allows the use). */
export async function useLimitedFeature(service: SupabaseClient, studentId: string, feature: 'voice' | 'visual'): Promise<{ allowed: boolean; remaining: number | null; limit: number | null }> {
  try {
    const [settings, { data: acc }] = await Promise.all([loadSettings(service), service.from('student_access').select('plan_code, access_until').eq('student_id', studentId).maybeSingle()]);
    if (isPaidAccess(acc)) return { allowed: true, remaining: null, limit: null };
    const limit = (settings.free_limits as any)[`${feature}_per_day`] as number;
    const day = new Date().toISOString().slice(0, 10);
    const { data: row } = await service.from('feature_usage').select('used').eq('student_id', studentId).eq('feature', feature).eq('day', day).maybeSingle();
    const used = row?.used ?? 0;
    const d = usageDecision(used, limit);
    if (d.allowed) await service.from('feature_usage').upsert({ student_id: studentId, feature, day, used: used + 1 }, { onConflict: 'student_id,feature,day' });
    return { allowed: d.allowed, remaining: d.allowed ? d.remaining - 1 : 0, limit };
  } catch { return { allowed: true, remaining: null, limit: null }; }
}
