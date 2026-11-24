import type { SupabaseClient } from '@supabase/supabase-js';

// v139: activity analytics from the real tables. Counts only (no names, no text). Every section says plainly when it is unavailable and why.
const DAY = 86400000;
export const WINDOWS = [7, 30, 90] as const;
export const cleanWindow = (v: unknown): number => { const n = Number(v); return (WINDOWS as readonly number[]).includes(n) ? n : 30; };
export const dayKey = (iso: string): string => iso.slice(0, 10);

export function lastDays(now: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10));
  return out;
}
/** Count per day across the window (days with nothing show 0). */
export function perDay(rows: { at: string }[], days: string[]): number[] {
  const m = new Map<string, number>(); for (const r of rows) m.set(dayKey(r.at), (m.get(dayKey(r.at)) ?? 0) + 1);
  return days.map((d) => m.get(d) ?? 0);
}
export function percentile(values: number[], p: number): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];
}
export const percentOf = (a: number, b: number): number | null => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

/** Groups raw AI error text into a few plain classes (never shows the raw text). */
export function classifyAiError(err: string | null | undefined, status: number | null | undefined): string {
  const e = String(err ?? '').toLowerCase();
  if (/timeout|timed out|aborted|stalled/.test(e)) return 'Too slow (timeout)';
  if (status === 429 || /rate|quota|limit/.test(e)) return 'Rate limit or quota';
  if (status === 503 || status === 502 || status === 500 || /overload|unavailable|high demand/.test(e)) return 'Provider overloaded or down';
  if (status === 401 || status === 403 || /key|auth|permission/.test(e)) return 'Key or permission problem';
  if (/network|fetch failed|econn/.test(e)) return 'Network error';
  return 'Other';
}

export interface Section<T> { available: boolean; reason?: string; data?: T }
const unavailable = <T,>(reason: string): Section<T> => ({ available: false, reason });
const missing = (err: any) => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(String(err.message ?? '')));

export interface ActivityReport {
  days: string[]; windowDays: number; generatedAt: string;
  signins: Section<{ perDay: number[]; total: number; distinctUsers: number; failed: number; wrongPortal: number; logouts: number; logStartedOn: string | null; truncated: boolean }>;
  returning: Section<{ lastWeekUsers: number; cameBack: number; ratePct: number | null }>;
  registrations: Section<{ perDay: number[]; total: number; byRole: Record<string, number> }>;
  lessons: Section<{ started: number; completed: number; abandoned: number; stillActive: number; completionPct: number | null; distinctStudents: number }>;
  ai: Section<{ providers: { provider: string; calls: number; failed: number; failPct: number | null; p50: number | null; p95: number | null }[]; errorClasses: { label: string; count: number }[]; total: number; failed: number; truncated: boolean }>;
}

const CAP = 20000;
export async function loadActivityAnalytics(service: SupabaseClient, windowDays: number, now: Date = new Date()): Promise<ActivityReport> {
  const days = lastDays(now, windowDays);
  const since = new Date(now.getTime() - windowDays * DAY).toISOString();
  const rep: ActivityReport = { days, windowDays, generatedAt: now.toISOString(), signins: unavailable(''), returning: unavailable(''), registrations: unavailable(''), lessons: unavailable(''), ai: unavailable('') };

  // sign-ins (from the activity log, 0068)
  try {
    const { data, error } = await service.from('activity_events').select('user_id, event_type, occurred_at').in('event_type', ['login', 'login_failed', 'login_wrong_portal', 'logout']).gte('occurred_at', new Date(now.getTime() - 2 * windowDays * DAY).toISOString()).order('occurred_at', { ascending: false }).limit(CAP);
    if (error) rep.signins = unavailable(missing(error) ? 'The activity log is not set up yet (run migration 0068).' : 'Could not read the activity log.');
    else {
      const all: any[] = data ?? [];
      const rows = all.filter((r) => r.occurred_at >= since);
      const logins = rows.filter((r) => r.event_type === 'login');
      const { data: first } = await service.from('activity_events').select('occurred_at').order('occurred_at', { ascending: true }).limit(1);
      rep.signins = { available: true, data: { perDay: perDay(logins.map((r) => ({ at: r.occurred_at })), days), total: logins.length, distinctUsers: new Set(logins.map((r) => r.user_id).filter(Boolean)).size, failed: rows.filter((r) => r.event_type === 'login_failed').length, wrongPortal: rows.filter((r) => r.event_type === 'login_wrong_portal').length, logouts: rows.filter((r) => r.event_type === 'logout').length, logStartedOn: (first as any)?.[0]?.occurred_at?.slice(0, 10) ?? null, truncated: all.length >= CAP } };
      // coming back: people who signed in in the previous window, and how many of them signed in again in this one
      const prev = new Set(all.filter((r) => r.event_type === 'login' && r.occurred_at < since && r.user_id).map((r) => r.user_id));
      const cur = new Set(logins.map((r) => r.user_id).filter(Boolean));
      const startedOn = (first as any)?.[0]?.occurred_at as string | undefined;
      if (!startedOn || startedOn > new Date(now.getTime() - windowDays * DAY).toISOString()) rep.returning = unavailable(`Needs at least ${windowDays} days of sign-in history before this window${startedOn ? ` (the log started on ${startedOn.slice(0, 10)})` : ''}.`);
      else rep.returning = { available: true, data: { lastWeekUsers: prev.size, cameBack: [...prev].filter((u) => cur.has(u)).length, ratePct: percentOf([...prev].filter((u) => cur.has(u)).length, prev.size) } };
    }
  } catch { rep.signins = unavailable('Could not read the activity log.'); }
  if (!rep.returning.available && !rep.returning.reason) rep.returning = unavailable('Needs the activity log.');

  // registrations
  try {
    const { data, error } = await service.from('users').select('role, created_at').gte('created_at', since).limit(CAP);
    if (error) rep.registrations = unavailable('Could not read accounts.');
    else { const rows: any[] = data ?? []; const byRole: Record<string, number> = {}; for (const r of rows) byRole[r.role] = (byRole[r.role] ?? 0) + 1; rep.registrations = { available: true, data: { perDay: perDay(rows.map((r) => ({ at: r.created_at })), days), total: rows.length, byRole } }; }
  } catch { rep.registrations = unavailable('Could not read accounts.'); }

  // lessons
  try {
    const { data, error } = await service.from('learning_sessions').select('student_id, status, started_at').gte('started_at', since).limit(CAP);
    if (error) rep.lessons = unavailable('Could not read lessons.');
    else { const rows: any[] = data ?? []; const c = (s: string) => rows.filter((r) => r.status === s).length; const done = c('completed'), ab = c('abandoned'); rep.lessons = { available: true, data: { started: rows.length, completed: done, abandoned: ab, stillActive: c('active'), completionPct: percentOf(done, done + ab), distinctStudents: new Set(rows.map((r) => r.student_id)).size } }; }
  } catch { rep.lessons = unavailable('Could not read lessons.'); }

  // AI reliability
  try {
    const { data, error } = await service.from('ai_usage').select('provider, ok, latency_ms, error, status_code, created_at').gte('created_at', since).limit(CAP);
    if (error) rep.ai = unavailable(missing(error) ? 'The AI request log is not set up.' : 'Could not read the AI request log.');
    else {
      const rows: any[] = data ?? []; const by = new Map<string, any[]>();
      for (const r of rows) { const k = r.provider ?? 'unknown'; by.set(k, [...(by.get(k) ?? []), r]); }
      const providers = [...by.entries()].map(([provider, rs]) => { const failed = rs.filter((r) => !r.ok).length; const lat = rs.filter((r) => r.ok && r.latency_ms != null).map((r) => Number(r.latency_ms)); return { provider, calls: rs.length, failed, failPct: percentOf(failed, rs.length), p50: percentile(lat, 50), p95: percentile(lat, 95) }; }).sort((a, b) => b.calls - a.calls);
      const cls = new Map<string, number>(); for (const r of rows.filter((r) => !r.ok)) { const k = classifyAiError(r.error, r.status_code); cls.set(k, (cls.get(k) ?? 0) + 1); }
      rep.ai = { available: true, data: { providers, errorClasses: [...cls.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count), total: rows.length, failed: rows.filter((r) => !r.ok).length, truncated: rows.length >= CAP } };
    }
  } catch { rep.ai = unavailable('Could not read the AI request log.'); }
  return rep;
}
