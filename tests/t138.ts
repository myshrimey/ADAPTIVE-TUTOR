// t138: central activity log (v138): minimal events only, never breaks a flow, server-only table, hooks, timeline page, retention.
import { readFileSync } from 'fs';
import { cleanMeta, isActivityType, ACTIVITY_TYPES, ACTIVITY_CATEGORIES, cleanTimelineFilter, recordActivity, recordActivityForStudent, loadTimeline } from '../packages/core/activity';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
(async () => {
  ok(Object.keys(cleanMeta({ portal: 'student', by_parent: true, count: 3 })).length === 3, 'safe labels, flags and numbers are kept');
  const dirty = cleanMeta({ message: 'hi', answer: '42', email: 'a@b.c', phone: '9', device_id: 'x', ip: '1.1.1.1', note: 'n', text: 't', ok_label: 'a@b.c', long: 'x'.repeat(41), Bad: 'x', obj: { a: 1 } as any, nan: NaN });
  ok(Object.keys(dirty).length === 0, 'text, answers, contact, device keys and unsafe values are all dropped: ' + JSON.stringify(dirty));
  ok(Object.keys(cleanMeta(Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['k' + i, i])))).length === 8, 'at most 8 meta keys');
  ok(isActivityType('login') && !isActivityType('message_sent') && !isActivityType('toString'), 'only listed event names are accepted');
  ok(Object.values(ACTIVITY_TYPES).every((c) => (ACTIVITY_CATEGORIES as readonly string[]).includes(c)), 'every event has a valid category');
  const f1 = cleanTimelineFilter({ from: '2026-01-01', to: 'bad', category: 'account', type: 'nope' });
  ok(f1.from === '2026-01-01' && !f1.to && f1.category === 'account' && !f1.type && f1.limit === 200, 'timeline filter keeps only valid values');
  // recordActivity
  let row: any = null;
  const okSvc: any = { from: () => ({ insert: (r: any) => { row = r; return Promise.resolve({ error: null }); } }) };
  ok(await recordActivity(okSvc, { userId: 'u', type: 'login', role: 'student', meta: { email: 'x@y.z', portal: 'student' } }) && row.category === 'account' && row.event_type === 'login' && JSON.stringify(row.meta) === '{"portal":"student"}', 'recordActivity writes category and cleaned meta');
  ok(!(await recordActivity(okSvc, { userId: 'u', type: 'bogus' as any })), 'unknown event name is refused');
  const bad: any = { from: () => { throw new Error('db down'); } };
  ok(!(await recordActivity(bad, { userId: 'u', type: 'login' })) && !(await recordActivityForStudent(bad, 's', { type: 'profile_saved' })), 'a broken database never throws into the product');
  const missingTbl: any = { from: () => ({ insert: () => Promise.resolve({ error: { code: '42P01', message: 'relation does not exist' } }) }) };
  ok((await recordActivity(missingTbl, { userId: 'u', type: 'login' })) === false, 'before migration 0068 the event is just not kept');
  const tl: any = { from: () => { const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q, gte: () => q, lte: () => q, then: (res: any) => res({ data: null, error: { code: '42P01', message: 'does not exist' } }) }; return q; } };
  ok((await loadTimeline(tl, 'u', { limit: 5 })) === null, 'timeline returns null (not 0 rows) when the table is missing');
  // migration
  const m = R('packages/db/migrations/0068_activity_events.sql');
  ok(/create table if not exists activity_events/.test(m) && /enable row level security/.test(m) && !/create policy/.test(m), 'server-only table');
  ok(/user_id uuid references users\(id\) on delete cascade/.test(m) && /idx_activity_user_time/.test(m) && /idx_activity_type_time/.test(m), 'deletes with the account; indexed by account and by type');
  ok(!/\b(message|answer|content|email|phone|ip_address|user_agent)\b\s+text/.test(m.replace(/--.*$/gm, '')), 'table has no column for text, contact or device details');
  ok(/where not exists \(select 1 from system_changelog where version = 'v138'/.test(m), 'changelog guarded');
  // hooks
  const login = R('apps/web/app/api/auth/login/route.ts');
  ok(/type: 'login_failed'/.test(login) && /type: 'login_wrong_portal'/.test(login) && /type: 'login', role/.test(login) && !/login_failed'[^)]*identifier/.test(login), 'login route records success, failure and wrong portal (never the name typed)');
  ok(/profile_saved/.test(R('apps/web/app/api/profile/route.ts')) && /payment_claim_submitted/.test(R('apps/web/app/api/commerce/purchase/route.ts')) && /report_viewed/.test(R('apps/web/app/api/report/route.ts')), 'profile, payment request and report hooks exist');
  ok(/api\/activity\/logout/.test(R('apps/web/components/SiteHeader.tsx')) && /api\/activity\/logout/.test(R('apps/web/components/SignOutButton.tsx')) && /catch\(\(\) => \{\}\)/.test(R('apps/web/components/SignOutButton.tsx')), 'sign-out buttons record the sign-out and never block');
  // page
  const page = R('apps/web/app/admin/accounts/[id]/timeline/page.tsx');
  ok(/adminPageGate\(\)/.test(page) && /activity\.timeline_view/.test(page) && /loadTimeline/.test(page), 'timeline is Super Admin only and its opening is audited');
  ok(/\/timeline/.test(R('apps/web/app/admin/accounts/[id]/page.tsx')), 'account page links to the timeline');
  // retention
  ok(/activity_events/.test(R('packages/core/retention/index.ts')) && /public\.activity_events\s+where occurred_at/.test(R('scripts/retention/purge-older-than.sql')), 'retention rule and purge line include the activity log');
  console.log(`t138: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
