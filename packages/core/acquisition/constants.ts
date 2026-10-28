// v76 Acquisition & Referral Intelligence. Pure constants and cleaners. Nothing here reads or writes the database.

/** Known acquisition sources. A custom source (any other clean name) is allowed and reported under its own name. */
export const ACQ_SOURCES = ['facebook', 'instagram', 'linkedin', 'youtube', 'whatsapp', 'telegram', 'google', 'organic_search', 'referral', 'tutor', 'coaching_centre', 'school', 'government_school', 'founder', 'direct', 'offline', 'event', 'partner', 'unknown'] as const;
export const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', whatsapp: 'WhatsApp', telegram: 'Telegram', google: 'Google', organic_search: 'Organic search',
  referral: 'Referral', tutor: 'Tutor', coaching_centre: 'Coaching centre', school: 'School', government_school: 'Government school', founder: 'Founder', direct: 'Direct', offline: 'Offline', event: 'Event', partner: 'Partner', unknown: 'Unknown',
};
const ALIAS: Record<string, string> = { fb: 'facebook', ig: 'instagram', insta: 'instagram', li: 'linkedin', yt: 'youtube', wa: 'whatsapp', whats_app: 'whatsapp', tg: 'telegram', ref: 'referral', coaching: 'coaching_centre', centre: 'coaching_centre', center: 'coaching_centre', govt_school: 'government_school', search: 'organic_search', 'google.com': 'google', 'l.facebook.com': 'facebook', 'm.facebook.com': 'facebook', 'lm.facebook.com': 'facebook', 'l.instagram.com': 'instagram', 'bing.com': 'organic_search', 'duckduckgo.com': 'organic_search', 'family_friend': 'whatsapp' };
/** Lower-case, clean, keep custom names (up to 40 characters). Empty = "unknown". Never throws. */
export function cleanSource(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase().trim().replace(/^www\./, '').replace(/[^a-z0-9_.\- ]/g, '').replace(/[\s\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  if (!s) return 'unknown';
  return ALIAS[s] ?? s;
}
export const sourceLabel = (s: string | null | undefined) => (s ? SOURCE_LABEL[s] ?? s.replace(/_/g, ' ') : 'Not recorded');
/** Channel groups for the comparison table. Everything not named goes to "Other" (still listed by its own name in the full table). */
export const CHANNEL_ROWS = ['facebook', 'instagram', 'linkedin', 'whatsapp', 'google', 'referral', 'tutor', 'coaching_centre', 'school', 'founder', 'offline', 'direct'] as const;
export const channelGroup = (s: string | null | undefined): string => {
  const k = s ?? 'unknown';
  if (k === 'organic_search') return 'google';
  if (k === 'government_school') return 'school';
  return (CHANNEL_ROWS as readonly string[]).includes(k) ? k : 'other';
};
/** Organic = no cash spent to reach the person. NOT the same as "free": founder time is not recorded as money. */
export const ORGANIC_SOURCES = new Set(['founder', 'whatsapp', 'referral', 'tutor', 'coaching_centre', 'school', 'government_school', 'offline', 'direct', 'organic_search', 'telegram', 'event', 'partner']);

export const CUSTOMER_TYPES = ['student', 'family', 'tutor', 'coaching_centre', 'school', 'government_school', 'other'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export const CUSTOMER_LABEL: Record<string, string> = { student: 'Student', family: 'Parent / family', tutor: 'Tutor', coaching_centre: 'Coaching centre', school: 'School', government_school: 'Government school / institution', other: 'Other organisation' };
export function customerTypeOfRole(role: string | null | undefined): CustomerType {
  switch (role) { case 'student': return 'student'; case 'parent': return 'family'; case 'tutor': return 'tutor'; case 'centre': return 'coaching_centre'; case 'teacher': return 'other'; default: return 'other'; }
}
export const PARTNER_KINDS = ['tutor', 'centre', 'school', 'govt_school', 'other'] as const;
export const PARTNER_STATUS = ['lead', 'meeting', 'pilot', 'active', 'paused', 'closed'] as const;
export const PARTNER_REWARD_STATUS = ['none', 'under_review', 'approved', 'declined', 'paid_by_hand'] as const;
export const PARTNER_PREFIX: Record<string, string> = { tutor: 'TUTOR', centre: 'CENTRE', school: 'SCHOOL', govt_school: 'GOVT', other: 'PARTNER' };

export type AcqDataLabel = 'ACTUAL' | 'CALCULATED' | 'ESTIMATED' | 'MANUAL' | 'INSUFFICIENT DATA';
export const REPORTING_MODELS = ['first_touch', 'last_touch', 'referral', 'all_touches'] as const;
export type ReportingModel = (typeof REPORTING_MODELS)[number];
export const MODEL_LABEL: Record<string, string> = { first_touch: 'First touch', last_touch: 'Last touch', referral: 'Referral source', all_touches: 'All attributed touches (a person counts under every source they came through)' };
export const NOT_LINKED = 'Not linked';
export const NOT_AVAILABLE = 'Not available';
export const VISITORS_NOT_MATCHED = 'Visitors and registrations are not directly matched.';

/** Smallest number of people before a rate or a recommendation is shown. Below it: "Insufficient data". Editable in settings. */
export const DEFAULT_MIN_SAMPLE = 20;
export const EXPERIMENT_METRICS = ['signup_rate', 'diagnostic_completion', 'activation', 'd7_retention', 'paid_conversion', 'revenue_per_customer'] as const;
export const EXPERIMENT_METRIC_LABEL: Record<string, string> = { signup_rate: 'Sign-up rate', diagnostic_completion: 'Diagnostic completion', activation: 'Activation', d7_retention: 'D7 retention', paid_conversion: 'Paid conversion', revenue_per_customer: 'Revenue per customer' };

export interface AcqSettings {
  minSample: number;              // people before a rate/recommendation is shown
  model: ReportingModel;          // default reporting model
  weights: { signup: number; diagnostic: number; active: number; paid: number }; // referral quality score weights
}
export const DEFAULT_ACQ_SETTINGS: AcqSettings = { minSample: DEFAULT_MIN_SAMPLE, model: 'first_touch', weights: { signup: 1, diagnostic: 3, active: 5, paid: 10 } };
const n = (v: unknown, lo: number, hi: number, d: number) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d; };
export function cleanAcqSettings(raw: any): AcqSettings {
  const r = raw && typeof raw === 'object' ? raw : {}; const w = r.weights && typeof r.weights === 'object' ? r.weights : {};
  const d = DEFAULT_ACQ_SETTINGS;
  return {
    minSample: n(r.minSample, 5, 500, d.minSample),
    model: (REPORTING_MODELS as readonly string[]).includes(r.model) ? r.model : d.model,
    weights: { signup: n(w.signup, 0, 100, d.weights.signup), diagnostic: n(w.diagnostic, 0, 100, d.weights.diagnostic), active: n(w.active, 0, 100, d.weights.active), paid: n(w.paid, 0, 100, d.weights.paid) },
  };
}
