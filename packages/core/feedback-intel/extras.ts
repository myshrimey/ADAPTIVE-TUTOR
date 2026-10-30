// Feedback Intelligence extras (v73). Pure rules: no database, no AI. Everything shown to the founder is a count or a stated formula.
import { normalise, type FbCategory, type FbStatus, type Level } from './rules';

export const FB_IMPACTS: Record<string, string> = { minor: 'Minor inconvenience', harder: 'Made the task harder', blocked: 'Could not complete the task', incorrect: 'Gave me incorrect information', prep: 'Could affect my preparation', serious: 'Serious problem' };
export const IMPACT_POINTS: Record<string, number> = { minor: 0, harder: 2, blocked: 6, incorrect: 8, prep: 8, serious: 10 };
export const FB_KINDS: Record<string, string> = { bug: 'Something is broken', wrong_answer: 'A wrong answer or marking', question: 'A problem with a question', explanation: 'A confusing explanation', language: 'Language or translation', idea: 'An idea or request', price: 'Price or payment', praise: 'Something I like', other: 'Something else' };
export const FB_SOURCES: Record<string, string> = { in_app: 'In the app', email: 'Email', whatsapp: 'WhatsApp or message', social: 'Social media', tutor_meeting: 'Tutor meeting', parent_meeting: 'Parent meeting', centre_meeting: 'Coaching-centre meeting', school_meeting: 'School meeting', phone: 'Phone call', founder: 'Founder observation', support: 'Support request' };
export const FB_ROLES: Record<string, string> = { student: 'Student', parent: 'Parent', tutor: 'Tutor', teacher: 'Teacher', centre: 'Coaching centre', admin: 'Administrator', visitor: 'Visitor / not signed in', other: 'Other' };
export const MOAT_LEVELS = ['none', 'low', 'medium', 'high', 'core'] as const;
export type Moat = (typeof MOAT_LEVELS)[number];
export const VALIDATION: Record<string, string> = { fixed_validated: 'Fixed and validated', fixed_not_validated: 'Fixed, not yet validated', partial: 'Partly fixed', not_fixed: 'Not fixed', regression: 'Regression (a new problem)', reopened: 'Reopened' };

/** The role is inferred from the page and a student lookup, never from a claim by the browser. */
export function roleFromPage(page: string | null | undefined, isStudent: boolean, signedIn: boolean): string {
  if (isStudent) return 'student';
  const p = (page ?? '').toLowerCase();
  if (p.startsWith('/parent')) return 'parent';
  if (p.startsWith('/tutor')) return 'tutor';
  if (p.startsWith('/centre')) return 'centre';
  if (p.startsWith('/teacher')) return 'teacher';
  if (p.startsWith('/admin')) return 'admin';
  return signedIn ? 'other' : 'visitor';
}
const POS = ['love', 'loved', 'great', 'helpful', 'good app', 'very good', 'excellent', 'amazing', 'thank', 'useful', 'like the', 'like this', 'liked', 'awesome', 'best part', 'easy to use', 'nice', 'lovely', 'improved my'];
const NEG = ['not ', "n't", 'cannot', 'wrong', 'bug', 'error', 'slow', 'broken', 'problem', 'issue', 'difficult', 'confus', 'too ', 'fail', 'but '];
/** Praise: positive words, no problem words (or a 4-5 star rating with no problem words). Used only for the "Top loved features" count. */
export function isPositive(message: string, rating?: number | null, kind?: string | null): boolean {
  if (kind === 'praise') return true;
  const t = ` ${normalise(message)} `;
  const pos = POS.some((w) => t.includes(w)); const neg = NEG.some((w) => t.includes(w));
  if (neg) return false;
  return pos;
}
const LEARNING_AREAS = ['diagnostic', 'mock exam', 'handwritten marking', 'learning path', 'learning', 'quiz', 'written answers', 'reports'];
const PRIVACY = /\b(privacy|private data|my data|personal data|leak|hacked|password|stranger|someone else's|another student'?s|can see my)\b/i;
export interface GroupFacts {
  category: FbCategory; area: string; severity: Level; risk: Level; reports: number; uniqueReports: number; reports7d: number; users: number; roles: string[]; impactMax: number; moat: Moat; positive?: boolean; status: FbStatus; text?: string;
}
export interface Priority { score: number; level: 'P0' | 'P1' | 'P2' | 'P3'; parts: { label: string; points: number; why: string }[]; reasons: string[]; learningCritical: boolean; revenueCritical: boolean; escalated: boolean; computedLevel: 'P0' | 'P1' | 'P2' | 'P3' }
export const PRIORITY_THRESHOLDS = { P0: 60, P1: 40, P2: 20 } as const;
export const learningCritical = (f: Pick<GroupFacts, 'category' | 'area' | 'risk'>) => (f.category === 'wrong_answer') || (LEARNING_AREAS.includes(f.area) && (f.category === 'poor_question' || f.category === 'bad_explanation' || f.category === 'bug') && (f.category === 'bug' ? f.risk === 'high' : f.risk !== 'low')) || (f.area === 'diagnostic' && f.risk === 'high');
export const revenueCritical = (f: Pick<GroupFacts, 'category' | 'area'>) => f.category === 'pricing' || f.area === 'plans and pricing';
const MOAT_POINTS: Record<Moat, number> = { none: 0, low: 2, medium: 5, high: 10, core: 15 };
const LVL = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;
/** Priority = a visible sum. Nothing is hidden: every part is returned with its points and the reason. Thresholds are constants (P0 60+, P1 40+, P2 20+). */
export function feedbackPriority(f: GroupFacts, override?: { level?: string | null }): Priority {
  const sev = f.severity === 'high' ? 3 : f.severity === 'medium' ? 2 : 1;
  const learn = learningCritical(f), rev = revenueCritical(f);
  const parts = [
    { label: 'Severity', points: sev * 10, why: `${f.severity} severity (high 30, medium 20, low 10)` },
    { label: 'People affected', points: Math.min(f.users, 20) * 2, why: `${f.users} different report${f.users === 1 ? '' : 's'} counted once each (2 points each, up to 40)` },
    { label: 'Recent frequency', points: Math.min(f.reports7d, 10) * 1.5, why: `${f.reports7d} report${f.reports7d === 1 ? '' : 's'} in the last 7 days (1.5 each, up to 15)` },
    { label: 'Effect on learning', points: learn ? 15 : 0, why: learn ? 'could give wrong answers, marking, explanations or diagnostic results' : 'no learning-quality risk found' },
    { label: 'Money / trust', points: rev ? 10 : 0, why: rev ? 'concerns price or payment' : 'not about price or payment' },
    { label: 'Reporters\' own words', points: f.impactMax, why: 'the worst "how did it affect you" answer given (0 to 10)' },
    { label: 'Moat value', points: MOAT_POINTS[f.moat], why: `moat tag "${f.moat}" (core 15, high 10, medium 5, low 2)` },
  ];
  const score = Math.round(parts.reduce((a, p) => a + p.points, 0) * 10) / 10;
  let computed: Priority['level'] = score >= PRIORITY_THRESHOLDS.P0 ? 'P0' : score >= PRIORITY_THRESHOLDS.P1 ? 'P1' : score >= PRIORITY_THRESHOLDS.P2 ? 'P2' : 'P3';
  const reasons: string[] = [];
  let escalated = false;
  // Automatic escalation: never lowers a level, only raises to at least P1 and says why. A person still decides everything.
  const esc = (min: Priority['level'], why: string) => { reasons.push(why); if (LVL[computed] > LVL[min]) { computed = min; escalated = true; } };
  if (f.category === 'wrong_answer') esc('P1', 'Possible wrong answer or marking: always reviewed first.');
  if (f.text && PRIVACY.test(f.text)) esc('P0', 'Mentions privacy or personal data: review straight away (use a separate private process).');
  if (f.area === 'diagnostic' && f.risk === 'high' && f.users >= 3) esc('P1', 'Several people report a problem in the diagnostic, which affects every later recommendation.');
  if (rev && f.users >= 3) esc('P1', 'Several people report price or payment trouble.');
  const level = (override?.level && /^P[0-3]$/.test(override.level) ? override.level : computed) as Priority['level'];
  return { score, level, parts, reasons, learningCritical: learn, revenueCritical: rev, escalated, computedLevel: computed };
}
/** A suggestion for the moat tag from where the problem is. The founder sets the real tag; this only pre-fills a hint. */
export function suggestMoat(category: FbCategory, area: string): Moat {
  if (area === 'diagnostic' || area === 'learning path') return 'core';
  if (area === 'handwritten marking' || category === 'translation' || category === 'poor_question' || category === 'wrong_answer') return 'high';
  if (area === 'mock exam' || area === 'reports' || area === 'parent view' || area === 'tutor view' || area === 'centre view') return 'medium';
  return 'none';
}
export const QUESTION_KINDS: Record<string, string> = { wrong_answer: 'Wrong answer', wrong_solution: 'Wrong solution', ambiguous: 'Ambiguous question', wrong_difficulty: 'Wrong difficulty', wrong_class: 'Wrong class level', wrong_topic: 'Wrong topic', wrong_language: 'Wrong language', poor_translation: 'Poor translation', duplicate_question: 'Duplicate question', typo: 'Typographical error', curriculum: 'Curriculum mismatch', good_question: 'Good question' };
export const AI_REPLY_KINDS: Record<string, string> = { correct: 'Correct', mostly: 'Mostly correct', incorrect: 'Incorrect', confusing: 'Confusing', too_hard: 'Too difficult', too_easy: 'Too easy', irrelevant: 'Not relevant', language: 'Language problem', other: 'Other' };

// ---- context sanitising (the browser sends a few ids; none is trusted beyond being a short safe string) ----
const SAFE = /^[A-Za-z0-9_.:-]{1,64}$/;
export function cleanContext(raw: any): Record<string, string> {
  const out: Record<string, string> = {}; if (!raw || typeof raw !== 'object') return out;
  for (const k of ['feature', 'questionId', 'sessionId', 'attemptId', 'mockId', 'reportId', 'diagnosticId', 'aiRequestId', 'questionKind', 'aiReplyKind', 'locale']) { const v = raw[k]; if (typeof v === 'string' && SAFE.test(v.trim())) out[k] = v.trim(); }
  return out;
}

// ---- analytics (pure) ----
export interface MsgLite { id: string; created_at: string; role: string | null; source: string | null; feature_area: string | null; category: string | null; cluster_id: string | null; positive: boolean | null; duplicate_of: string | null; impact: string | null }
export interface ClusterLite { id: string; title: string; category: FbCategory; feature_area: string; severity: Level; risk: Level; status: FbStatus; report_count: number; moat: string | null; priority_override: string | null; created_at: string; decided_at: string | null; validated_at: string | null; validation_status: string | null; task: unknown; reports7d?: number; users?: number; roles?: string[]; impactMax?: number }
export interface FbAnalytics {
  total: number; open: number; highPriority: number; critical: number; newThisWeek: number; duplicates: number; approved: number; implemented: number; awaitingValidation: number; reopened: number;
  perDay: { day: string; n: number }[]; byRole: [string, number][]; byArea: [string, number][]; bySource: [string, number][]; byOutcome: Record<string, number>;
  top: { c: ClusterLite; p: Priority }[]; quickWins: { c: ClusterLite; p: Priority }[]; strategic: { c: ClusterLite; p: Priority }[]; learning: { c: ClusterLite; p: Priority }[]; revenue: { c: ClusterLite; p: Priority }[];
  loved: [string, number][]; avgReviewDays: number | null; avgResolveDays: number | null; duplicateRate: number | null; rejectionRate: number | null; implementationRate: number | null; regressionRate: number | null;
}
const OPEN = ['new', 'analysed', 'proposed', 'under_review', 'deferred', 'modified', 'approved'];
const tally = (xs: (string | null | undefined)[]): [string, number][] => { const m = new Map<string, number>(); for (const x of xs) { const k = x || 'unknown'; m.set(k, (m.get(k) ?? 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
export function buildFeedbackAnalytics(msgs: MsgLite[], clusters: ClusterLite[], now = new Date()): FbAnalytics {
  const weekAgo = now.getTime() - 7 * 86400000; const days = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  const withP = clusters.map((c) => ({ c, p: feedbackPriority({ category: c.category, area: c.feature_area, severity: c.severity, risk: c.risk, reports: c.report_count, uniqueReports: c.report_count, reports7d: c.reports7d ?? 0, users: c.users ?? c.report_count, roles: c.roles ?? [], impactMax: c.impactMax ?? 0, moat: (c.moat as Moat) ?? 'none', status: c.status }, { level: c.priority_override }) }));
  const live = withP.filter((x) => OPEN.includes(x.c.status));
  const by = (f: (x: { c: ClusterLite; p: Priority }) => boolean, n = 10) => live.filter(f).sort((a, b) => b.p.score - a.p.score).slice(0, n);
  const perDay: { day: string; n: number }[] = []; for (let i = 29; i >= 0; i--) { const d = new Date(now.getTime() - i * 86400000 + 5.5 * 3600_000).toISOString().slice(0, 10); perDay.push({ day: d, n: 0 }); }
  for (const m of msgs) { const d = new Date(new Date(m.created_at).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10); const e = perDay.find((x) => x.day === d); if (e) e.n++; }
  const reviewed = clusters.filter((c) => c.decided_at); const resolved = clusters.filter((c) => c.validated_at);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const outcome: Record<string, number> = {}; for (const c of clusters) outcome[c.status] = (outcome[c.status] ?? 0) + 1;
  const decided = clusters.filter((c) => ['approved', 'rejected', 'modified', 'implemented', 'verified', 'rolled_back'].includes(c.status)).length;
  const dup = msgs.filter((m) => m.duplicate_of).length;
  return {
    total: msgs.length, open: live.length, highPriority: live.filter((x) => x.p.level === 'P1').length, critical: live.filter((x) => x.p.level === 'P0').length,
    newThisWeek: msgs.filter((m) => new Date(m.created_at).getTime() >= weekAgo).length, duplicates: dup,
    approved: clusters.filter((c) => c.status === 'approved' || c.status === 'modified').length, implemented: clusters.filter((c) => c.status === 'implemented').length,
    awaitingValidation: clusters.filter((c) => c.status === 'implemented' && !c.validation_status).length, reopened: clusters.filter((c) => c.validation_status === 'reopened').length,
    perDay, byRole: tally(msgs.map((m) => m.role)), byArea: tally(msgs.map((m) => m.feature_area)), bySource: tally(msgs.map((m) => m.source)), byOutcome: outcome,
    top: by(() => true), quickWins: by((x) => ['ux', 'language', 'poor_question', 'bad_explanation'].includes(x.c.category) && x.p.level !== 'P3', 5), strategic: by((x) => x.c.moat === 'high' || x.c.moat === 'core', 5),
    learning: by((x) => x.p.learningCritical, 10), revenue: by((x) => x.p.revenueCritical, 10),
    loved: tally(msgs.filter((m) => m.positive).map((m) => m.feature_area)).slice(0, 8),
    avgReviewDays: avg(reviewed.map((c) => days(c.created_at, c.decided_at!))), avgResolveDays: avg(resolved.map((c) => days(c.created_at, c.validated_at!))),
    duplicateRate: msgs.length ? dup / msgs.length : null, rejectionRate: decided ? clusters.filter((c) => c.status === 'rejected').length / decided : null,
    implementationRate: decided ? clusters.filter((c) => ['implemented', 'verified'].includes(c.status)).length / decided : null, regressionRate: clusters.filter((c) => ['implemented', 'verified', 'rolled_back'].includes(c.status)).length ? clusters.filter((c) => c.validation_status === 'regression' || c.status === 'rolled_back').length / clusters.filter((c) => ['implemented', 'verified', 'rolled_back'].includes(c.status)).length : null,
  };
}

// ---- filters (pure) ----
export interface QueueFilter { q?: string; cat?: string; area?: string; src?: string; role?: string; prio?: string; sort?: string; moat?: string }
export function filterClusters<T extends { c: ClusterLite; p: Priority }>(rows: T[], f: QueueFilter, matchIds: Set<string> | null, srcOf: Map<string, Set<string>>, roleOf: Map<string, Set<string>>): T[] {
  let r = rows.filter((x) => (!f.cat || x.c.category === f.cat) && (!f.area || x.c.feature_area === f.area) && (!f.prio || x.p.level === f.prio) && (!f.moat || x.c.moat === f.moat)
    && (!f.src || srcOf.get(x.c.id)?.has(f.src)) && (!f.role || roleOf.get(x.c.id)?.has(f.role)) && (matchIds === null || matchIds.has(x.c.id)));
  const key: Record<string, (a: T, b: T) => number> = {
    priority: (a, b) => b.p.score - a.p.score, newest: (a, b) => b.c.created_at.localeCompare(a.c.created_at), oldest: (a, b) => a.c.created_at.localeCompare(b.c.created_at),
    reports: (a, b) => b.c.report_count - a.c.report_count,
  };
  r = [...r].sort(key[f.sort ?? 'priority'] ?? key.priority); return r;
}

/** v78: what a person is told about THEIR OWN report. Plain, kind words; never internal notes, priority, reviewer or other people's reports. */
export function friendlyFeedbackStatus(clusterStatus: string | null | undefined): { key: string; label: string; note: string } {
  switch (clusterStatus) {
    case 'approved': case 'modified': return { key: 'planned', label: 'Planned', note: 'We have decided to work on this.' };
    case 'implemented': case 'verified': return { key: 'fixed', label: 'Done', note: 'We made a change because of reports like yours. Thank you.' };
    case 'rejected': return { key: 'declined', label: 'Looked at', note: 'We looked at this and are not changing it right now.' };
    case 'deferred': return { key: 'later', label: 'Kept for later', note: 'We are keeping this for a later update.' };
    case 'rolled_back': return { key: 'again', label: 'Being looked at again', note: 'A change did not work out, so we are looking at it again.' };
    default: return { key: 'received', label: 'Received', note: 'We have your message and will look at it.' };
  }
}
