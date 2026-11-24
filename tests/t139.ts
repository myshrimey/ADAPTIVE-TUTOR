// t139: activity analytics (v139): real counts, honest "unavailable" labels, no personal data, Super Admin only.
import { readFileSync } from 'fs';
import { loadActivityAnalytics, percentile, perDay, lastDays, classifyAiError, cleanWindow, percentOf } from '../packages/core/activity';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const NOW = new Date('2026-11-22T10:00:00Z');
const iso = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();
// fake server-key client: tables in memory, simple filters
function fake(T: Record<string, any[] | null>) {
  return { from: (t: string) => {
    let rows: any[] | null = T[t] ?? null; const q: any = {};
    q.select = () => q; q.in = (c: string, v: string[]) => { rows = rows && rows.filter((r) => v.includes(r[c])); return q; };
    const col = (r: any) => r.occurred_at ?? r.created_at ?? r.started_at;
    q.gte = (_c: string, v: string) => { rows = rows && rows.filter((r) => col(r) >= v); return q; };
    q.order = (_c: string, o: any) => { if (rows) rows = [...rows].sort((a, b) => (col(a) < col(b) ? -1 : 1) * (o.ascending ? 1 : -1)); return q; };
    q.limit = (k: number) => { if (rows) rows = rows.slice(0, k); return q; };
    q.then = (res: any) => res(rows === null ? { data: null, error: { code: '42P01', message: 'relation does not exist' } } : { data: rows, error: null });
    return q; } } as any;
}
(async () => {
  ok(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50) === 5 && percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95) === 10 && percentile([], 50) === null, 'percentiles');
  ok(percentOf(1, 3) === 33.3 && percentOf(1, 0) === null, 'percent helper never divides by zero');
  const days = lastDays(NOW, 7); ok(days.length === 7 && days[6] === '2026-11-22' && days[0] === '2026-11-16', 'last 7 days end today');
  ok(perDay([{ at: iso(0) }, { at: iso(0) }, { at: iso(2) }, { at: iso(30) }], days).join() === '0,0,0,0,1,0,2', 'per-day counts ignore events outside the window');
  ok(cleanWindow('7') === 7 && cleanWindow('999') === 30 && cleanWindow(undefined) === 30, 'window is one of 7, 30, 90');
  ok(classifyAiError('gemini_request_timeout: x', null) === 'Too slow (timeout)' && classifyAiError('', 503) === 'Provider overloaded or down' && classifyAiError('x', 429) === 'Rate limit or quota' && classifyAiError('weird', 418) === 'Other', 'AI errors grouped into plain classes');
  ok(!/Joshi|@|secret/.test(classifyAiError('user joshi@x.com secret key bad', 401)), 'raw error text is never shown');
  const T = {
    activity_events: [
      { user_id: 'u1', event_type: 'login', occurred_at: iso(1) }, { user_id: 'u1', event_type: 'login', occurred_at: iso(2) }, { user_id: 'u2', event_type: 'login', occurred_at: iso(3) },
      { user_id: null, event_type: 'login_failed', occurred_at: iso(1) }, { user_id: 'u1', event_type: 'logout', occurred_at: iso(1) },
      { user_id: 'u1', event_type: 'login', occurred_at: iso(12) }, { user_id: 'u3', event_type: 'login', occurred_at: iso(13) },
    ],
    users: [{ role: 'student', created_at: iso(1) }, { role: 'student', created_at: iso(5) }, { role: 'parent', created_at: iso(6) }, { role: 'student', created_at: iso(40) }],
    learning_sessions: [{ student_id: 's1', status: 'completed', started_at: iso(1) }, { student_id: 's1', status: 'abandoned', started_at: iso(2) }, { student_id: 's2', status: 'completed', started_at: iso(3) }, { student_id: 's3', status: 'active', started_at: iso(1) }],
    ai_usage: [{ provider: 'gemini', ok: false, error: 'gemini_request_timeout', status_code: null, latency_ms: 10000, created_at: iso(1) }, { provider: 'gemini', ok: false, error: 'x', status_code: 503, latency_ms: 800, created_at: iso(2) }, { provider: 'groq', ok: true, latency_ms: 900, created_at: iso(1) }, { provider: 'groq', ok: true, latency_ms: 1100, created_at: iso(1) }],
  };
  const r = await loadActivityAnalytics(fake(T), 7, NOW);
  ok(r.signins.available && r.signins.data!.total === 3 && r.signins.data!.distinctUsers === 2 && r.signins.data!.failed === 1 && r.signins.data!.logouts === 1, 'sign-in counts inside the window');
  ok(r.signins.data!.logStartedOn === iso(13).slice(0, 10), 'says when the log started');
  ok(r.returning.available && r.returning.data!.lastWeekUsers === 2 && r.returning.data!.cameBack === 1 && r.returning.data!.ratePct === 50, 'coming back: u1 came back, u3 did not');
  ok(r.registrations.data!.total === 3 && r.registrations.data!.byRole.student === 2 && r.registrations.data!.byRole.parent === 1, 'new accounts by role');
  ok(r.lessons.data!.started === 4 && r.lessons.data!.completed === 2 && r.lessons.data!.completionPct === 66.7 && r.lessons.data!.distinctStudents === 3, 'lesson counts and finish rate (active ones are not counted as failed)');
  const g = r.ai.data!.providers.find((p) => p.provider === 'gemini')!, q = r.ai.data!.providers.find((p) => p.provider === 'groq')!;
  ok(g.failed === 2 && g.failPct === 100 && g.p50 === null && q.failed === 0 && q.p50 === 900, 'AI: per-provider failures; speed only from calls that worked');
  ok(r.ai.data!.errorClasses.map((e) => e.label).sort().join() === 'Provider overloaded or down,Too slow (timeout)', 'AI failures grouped');
  // honest unavailable labels
  const none = await loadActivityAnalytics(fake({ users: [], learning_sessions: [], ai_usage: [] }), 7, NOW);
  ok(!none.signins.available && /0068/.test(none.signins.reason!) && !none.returning.available, 'missing activity log: says to run 0068, no made-up zeros');
  const young = await loadActivityAnalytics(fake({ activity_events: [{ user_id: 'u1', event_type: 'login', occurred_at: iso(2) }], users: [], learning_sessions: [], ai_usage: [] }), 7, NOW);
  ok(young.signins.available && !young.returning.available && /history/.test(young.returning.reason!), 'a young log says coming-back needs more history');
  // page
  const page = R('apps/web/app/admin/activity/page.tsx');
  ok(/adminPageGate\(\)/.test(page) && /loadActivityAnalytics/.test(page) && /\/admin\/activity/.test(R('apps/web/lib/admin-menu.ts')), 'page is Super Admin only and in the menu');
  ok(!/email|student_id|display_name|message/.test(page.replace(/Signed in as \{g\.email\}/, '').replace(/no names, messages or answers/, '')), 'page shows counts only (no names, emails or messages)');
  console.log(`t139: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
