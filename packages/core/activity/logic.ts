// v138: pure helpers for the central activity log. Minimal by design: no message text, answers, contact or device details.
export const ACTIVITY_CATEGORIES = ['account', 'learning', 'assessment', 'engagement', 'technical', 'payment', 'admin'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type ActivityStatus = 'ok' | 'failed' | 'denied';

/** The ONLY event names the log accepts, each with its category. Add a name here deliberately (and in the tests) to record something new. */
export const ACTIVITY_TYPES = {
  login: 'account', login_failed: 'account', login_wrong_portal: 'account', logout: 'account',
  profile_saved: 'account', plan_changed: 'account',
  payment_claim_submitted: 'payment',
  report_viewed: 'assessment', report_generated: 'assessment',
  feature_started: 'engagement', // v148: which part of the app a student started; the feature name is one of ADOPTION_FEATURES below, nothing else
  permission_denied: 'technical', ai_failure: 'technical', upload_failed: 'technical',
} as const satisfies Record<string, ActivityCategory>;
export type ActivityType = keyof typeof ACTIVITY_TYPES;
export const isActivityType = (v: unknown): v is ActivityType => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ACTIVITY_TYPES, v);

const FORBIDDEN_KEY = /text|answer|message|prompt|password|token|secret|email|phone|whatsapp|name|address|ip|device|agent|note|reason/i;
/** Keeps at most 8 short, plain labels/numbers/flags. Anything that could carry a person's words or contact details is dropped. */
export function cleanMeta(meta: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!meta || typeof meta !== 'object') return out;
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (Object.keys(out).length >= 8) break;
    if (!/^[a-z][a-z0-9_]{0,29}$/.test(k) || FORBIDDEN_KEY.test(k)) continue;
    if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.length <= 40 && /^[\w .:-]*$/.test(v)) out[k] = v;
  }
  return out;
}

export interface TimelineFilter { from?: string; to?: string; category?: ActivityCategory; type?: ActivityType; limit: number }
const day = (v: unknown): string | undefined => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
export function cleanTimelineFilter(sp: Record<string, string | string[] | undefined>): TimelineFilter {
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  const cat = one('category'); const typ = one('type');
  return {
    from: day(one('from')), to: day(one('to')),
    category: (ACTIVITY_CATEGORIES as readonly string[]).includes(cat ?? '') ? (cat as ActivityCategory) : undefined,
    type: isActivityType(typ) ? typ : undefined,
    limit: 200,
  };
}

/** The ONLY feature names feature_started accepts (stored in the entity field). Add one here deliberately (and in t148). */
export const ADOPTION_FEATURES = { lesson: 'Lessons', diagnostic: 'Diagnostic', adaptive_check: 'Adaptive check', mock: 'Mock exams', challenge_zone: 'Challenge zone', revision: 'Revision' } as const;
export type AdoptionFeature = keyof typeof ADOPTION_FEATURES;
export const isAdoptionFeature = (v: unknown): v is AdoptionFeature => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ADOPTION_FEATURES, v);

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  login: 'Signed in', login_failed: 'Failed sign-in attempt', login_wrong_portal: 'Signed in on the wrong portal', logout: 'Signed out',
  profile_saved: 'Profile saved', plan_changed: 'Plan changed', payment_claim_submitted: 'Payment request submitted',
  report_viewed: 'Report viewed', report_generated: 'Report generated', feature_started: 'Started a feature', permission_denied: 'Permission denied', ai_failure: 'AI request failed', upload_failed: 'Upload failed',
};
