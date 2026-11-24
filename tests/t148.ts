// t148: per-feature adoption (v148): feature names only, six start points, test accounts left out, honest "since" note, no new table.
import { readFileSync, readdirSync } from 'fs';
import { ACTIVITY_TYPES, ADOPTION_FEATURES, isAdoptionFeature, recordFeatureUse, loadActivityAnalytics, cleanMeta } from '../packages/core';
(async () => {
  let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
  const R = (p: string) => readFileSync(p, 'utf8');
  ok(ACTIVITY_TYPES.feature_started === 'engagement', 'feature_started is a recorded event name');
  ok(Object.keys(ADOPTION_FEATURES).join() === 'lesson,diagnostic,adaptive_check,mock,challenge_zone,revision' && isAdoptionFeature('lesson') && !isAdoptionFeature('payments') && !isAdoptionFeature(undefined), 'only the six listed features are accepted');
  // recorder
  const rows: any[] = []; const db: any = { from(t: string) {
    if (t === 'students') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'U1' } }) }) }) };
    if (t === 'activity_events') return { insert: async (r: any) => { rows.push(r); return { error: null }; } };
    return {}; } };
  ok(await recordFeatureUse(db, 's1', 'mock') && rows[0].event_type === 'feature_started' && rows[0].entity === 'mock' && rows[0].user_id === 'U1' && rows[0].category === 'engagement', 'a start is recorded with the feature name');
  ok(!(await recordFeatureUse(db, 's1', 'secret_page' as any)) && rows.length === 1, 'an unknown feature name is refused');
  ok(Object.keys(rows[0].meta).length === 0 && !/text|answer|prompt/.test(JSON.stringify(rows[0])), 'nothing but the name is stored');
  const throwing: any = { from() { throw new Error('db down'); } };
  ok((await recordFeatureUse(throwing, 's1', 'lesson')) === false, 'a database failure never breaks the request');
  // the six start points
  const hooks: [string, string][] = [['session/start', 'lesson'], ['diagnostic/start', 'diagnostic'], ['baseline/start', 'adaptive_check'], ['mock/start', 'mock'], ['stretch/overview', 'challenge_zone'], ['review', 'revision']];
  for (const [r, feat] of hooks) { const c = R(`apps/web/app/api/${r}/route.ts`); ok(new RegExp(`recordFeatureUse\\((createServiceClient\\(\\)|service), studentId, '${feat}'\\)`).test(c) && c.indexOf('getCurrentStudentId()') < c.indexOf('recordFeatureUse(createServiceClient') + 1000, `${r} records ${feat}`); }
  ok((R('apps/web/app/api/mock/start/route.ts').match(/recordFeatureUse\(/g) ?? []).length === 2, 'both mock start paths record');
  const all = hooks.map(([r]) => R(`apps/web/app/api/${r}/route.ts`)).join('\n');
  ok(!/recordFeatureUse\((createServiceClient\(\)|service), studentId, [^']/.test(all), 'the feature name is a literal, never taken from the request');
  // no migration, no new table
  ok(!readdirSync('packages/db/migrations').some((m) => /feature/i.test(m)) && !/feature_started/.test(R('packages/db/migrations/0068_activity_events.sql')), 'no new migration or table: reuses the activity log');
  // analytics
  const ev = [
    { user_id: 'T', entity: 'lesson', occurred_at: '2026-11-20T10:00:00Z' }, { user_id: 'A', entity: 'lesson', occurred_at: '2026-11-20T11:00:00Z' }, { user_id: 'A', entity: 'lesson', occurred_at: '2026-11-21T11:00:00Z' },
    { user_id: 'B', entity: 'mock', occurred_at: '2026-11-21T10:00:00Z' }, { user_id: 'B', entity: 'not_a_feature', occurred_at: '2026-11-21T10:00:00Z' }];
  const tables: any = { activity_events: ev, test_accounts: [{ user_id: 'T' }], users: [], learning_sessions: [], ai_usage: [], students: [] };
  const svc: any = { from(t: string) { const data = tables[t] ?? []; const chain: any = new Proxy({}, { get: (_o, k: string) => k === 'then' ? (res: any) => res({ data, error: null }) : k === 'maybeSingle' ? async () => ({ data: data[0] ?? null }) : (..._a: any[]) => chain }); return chain; } };
  const rep = await loadActivityAnalytics(svc, 30, new Date('2026-11-22T00:00:00Z'));
  const fr = rep.features.data?.rows ?? [];
  ok(rep.features.available && fr.find((x: any) => x.feature === 'lesson')?.uses === 2 && fr.find((x: any) => x.feature === 'lesson')?.people === 1, 'the test account is left out; uses and people are counted separately');
  ok(fr.find((x: any) => x.feature === 'mock')?.uses === 1 && fr.length === 6 && rep.features.data?.students === 2, 'unknown names are ignored; every feature is listed, including those with 0');
  const bad: any = { from(t: string) { const chain: any = new Proxy({}, { get: (_o, k: string) => k === 'then' ? (res: any) => res({ data: null, error: { code: '42P01', message: 'relation does not exist' } }) : (..._a: any[]) => chain }); return chain; } };
  const rep2 = await loadActivityAnalytics(bad, 30, new Date('2026-11-22T00:00:00Z'));
  ok(!rep2.features.available && /migration 0068/.test(rep2.features.reason ?? ''), 'a missing log says so instead of showing zeros');
  const page = R('apps/web/app/admin/activity/page.tsx');
  ok(/Feature use/.test(page) && /earlier use is not counted/.test(page) && /Counts are starts, not minutes/.test(page) && !/\.(insert|update|delete)\(|fetch\(/.test(page), 'page is read only and says what the numbers are and since when');
  ok(!/learning|improv|better|effective/i.test(page.slice(page.indexOf('Feature use'), page.indexOf('AI reliability'))), 'no claim that use means learning');
  void cleanMeta;
  console.log(`t148: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
