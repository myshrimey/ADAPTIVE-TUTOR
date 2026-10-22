import type { SupabaseClient } from '@supabase/supabase-js';

// Engagement settings. Stored in commerce_settings key 'engagement'; the founder edits them at /admin/engagement-settings.
// Every number here is a starting value the founder can change. None is a claim about what works best.
export type EngagementFeature = 'missions' | 'xp' | 'streaks' | 'achievements' | 'personal_best' | 'leaderboard' | 'daily_challenge' | 'boss' | 'friend_challenge' | 'referral';
export const ENGAGEMENT_FEATURES: EngagementFeature[] = ['missions', 'xp', 'streaks', 'achievements', 'personal_best', 'leaderboard', 'daily_challenge', 'boss', 'friend_challenge', 'referral'];

export interface XpRules {
  diagnostic: number; learning_session: number; learning_session_correct_cap: number; practice_correct: number; practice_attempt: number;
  mistake_corrected: number; quiz_complete: number; mock_complete: number; revision: number; weak_practice_bonus: number; personal_best: number;
  mission_complete: number; boss_complete: number; daily_challenge: number; daily_cap: number; min_seconds_per_answer: number; recent_question_days: number; backfill_days: number;
}
export interface EngagementSettings {
  features: Record<EngagementFeature, boolean>;
  mission: { items: number; max_items: number; questions_target: number };
  xp: XpRules;
  notifications: { max_per_day: number };
  leaderboard: { min_members: number; window_days: number };
  /** feature -> { pct } : only that share of students get the feature (deterministic by student id). Missing = everyone the feature switch allows. */
  experiments: Record<string, { pct: number }>;
}

export const DEFAULT_ENGAGEMENT: EngagementSettings = {
  features: { missions: true, xp: true, streaks: true, achievements: true, personal_best: true, leaderboard: true, daily_challenge: true, boss: true, friend_challenge: false, referral: false },
  mission: { items: 3, max_items: 4, questions_target: 8 },
  xp: { diagnostic: 30, learning_session: 10, learning_session_correct_cap: 10, practice_correct: 2, practice_attempt: 1, mistake_corrected: 5, quiz_complete: 10, mock_complete: 40, revision: 8, weak_practice_bonus: 5, personal_best: 15, mission_complete: 15, boss_complete: 40, daily_challenge: 10, daily_cap: 150, min_seconds_per_answer: 3, recent_question_days: 7, backfill_days: 30 },
  notifications: { max_per_day: 2 },
  leaderboard: { min_members: 3, window_days: 7 },
  experiments: {},
};

const num = (v: unknown, d: number, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };

/** Fills any missing or out-of-range value with the default. Never throws. */
export function mergeEngagement(raw: any): EngagementSettings {
  const d = DEFAULT_ENGAGEMENT; const r = raw && typeof raw === 'object' ? raw : {};
  const features = { ...d.features };
  for (const f of ENGAGEMENT_FEATURES) if (typeof r.features?.[f] === 'boolean') features[f] = r.features[f];
  const xp: any = { ...d.xp };
  for (const k of Object.keys(d.xp) as (keyof XpRules)[]) xp[k] = num(r.xp?.[k], d.xp[k], 0, k === 'daily_cap' ? 2000 : k === 'backfill_days' ? 365 : k === 'recent_question_days' ? 90 : 500);
  const maxItems = num(r.mission?.max_items, d.mission.max_items, 1, 6);
  const experiments: Record<string, { pct: number }> = {};
  for (const [k, v] of Object.entries(r.experiments ?? {})) if ((ENGAGEMENT_FEATURES as string[]).includes(k)) experiments[k] = { pct: num((v as any)?.pct, 100, 0, 100) };
  return {
    features, xp,
    mission: { max_items: maxItems, items: Math.min(maxItems, num(r.mission?.items, d.mission.items, 1, 6)), questions_target: num(r.mission?.questions_target, d.mission.questions_target, 3, 30) },
    notifications: { max_per_day: num(r.notifications?.max_per_day, d.notifications.max_per_day, 0, 5) },
    leaderboard: { min_members: num(r.leaderboard?.min_members, d.leaderboard.min_members, 2, 50), window_days: num(r.leaderboard?.window_days, d.leaderboard.window_days, 1, 90) },
    experiments,
  };
}

/** Rejects (with a plain message) a settings object the founder typed that is not valid. Used by the admin API before saving. */
export function validateEngagementInput(raw: any): string | null {
  if (!raw || typeof raw !== 'object') return 'Settings must be an object.';
  for (const f of Object.keys(raw.features ?? {})) { if (!(ENGAGEMENT_FEATURES as string[]).includes(f)) return `Unknown feature: ${f}.`; if (typeof raw.features[f] !== 'boolean') return `${f} must be on or off.`; }
  for (const [k, v] of Object.entries(raw.xp ?? {})) { if (!(k in DEFAULT_ENGAGEMENT.xp)) return `Unknown XP rule: ${k}.`; const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 2000) return `${k} must be a number from 0 to 2000.`; }
  for (const [k, v] of Object.entries(raw.experiments ?? {})) { if (!(ENGAGEMENT_FEATURES as string[]).includes(k)) return `Unknown experiment feature: ${k}.`; const p = Number((v as any)?.pct); if (!Number.isFinite(p) || p < 0 || p > 100) return `Experiment ${k}: percentage must be 0 to 100.`; }
  if (raw.mission) { const m = raw.mission; if (m.items !== undefined && (!(Number(m.items) >= 1) || Number(m.items) > 6)) return 'Mission items must be 1 to 6.'; if (m.max_items !== undefined && Number(m.items ?? 0) > Number(m.max_items)) return 'Mission items cannot exceed the maximum.'; }
  return null;
}

export async function loadEngagementSettings(client: SupabaseClient): Promise<EngagementSettings> {
  try { const { data } = await client.from('commerce_settings').select('value').eq('key', 'engagement').maybeSingle(); return mergeEngagement(data?.value); } catch { return DEFAULT_ENGAGEMENT; }
}
export async function saveEngagementSettings(service: SupabaseClient, input: any): Promise<EngagementSettings> {
  const err = validateEngagementInput(input); if (err) throw new Error(err);
  const merged = mergeEngagement(input);
  const { error } = await service.from('commerce_settings').upsert({ key: 'engagement', value: merged, updated_at: new Date().toISOString() });
  if (error) throw new Error('Could not save settings.');
  return merged;
}

/** Stable 0-99 bucket for a student and a feature. The same student always lands in the same group, so groups can be compared later. */
export function bucket(studentId: string, key: string): number {
  let h = 2166136261; const s = `${studentId}:${key}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h % 100;
}
/** Is this feature on for this student? The switch must be on AND the student must be inside the experiment share (if one is set). */
export function featureOn(s: EngagementSettings, studentId: string, f: EngagementFeature): boolean {
  if (!s.features[f]) return false;
  const e = s.experiments[f];
  return !e || bucket(studentId, f) < e.pct;
}
