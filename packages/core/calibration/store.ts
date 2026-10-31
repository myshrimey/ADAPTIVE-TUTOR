import type { SupabaseClient } from '@supabase/supabase-js';
import { isSureLevel, summariseCalibration, type CalibrationSummary } from './calibration';

/** Best-effort: never throws, never blocks marking (works only after migration 0053). Returns true when saved. */
export async function recordCalibration(service: SupabaseClient, studentId: string, e: { source: 'review' | 'mixed' | 'baseline' | 'quiz'; confidence: unknown; correct: boolean; competencyId?: string | null; itemTable?: string | null; itemId?: string | null }): Promise<boolean> {
  try {
    if (!isSureLevel(e.confidence) || typeof e.correct !== 'boolean') return false;
    const { error } = await service.from('calibration_events').insert({ student_id: studentId, source: e.source, confidence: e.confidence, correct: e.correct, competency_id: e.competencyId ?? null, item_table: e.itemTable ?? null, item_id: e.itemId ?? null });
    return !error;
  } catch { return false; }
}

export async function loadCalibration(service: SupabaseClient, studentId: string, days = 90): Promise<CalibrationSummary> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await service.from('calibration_events').select('confidence, correct').eq('student_id', studentId).gte('created_at', since).order('created_at', { ascending: false }).limit(500);
    return summariseCalibration((data ?? []) as any[]);
  } catch { return summariseCalibration([]); }
}
