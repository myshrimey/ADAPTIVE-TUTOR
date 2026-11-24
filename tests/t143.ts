// t143: test accounts (v143): server-only table, Super Admin only route with reason + audit, label only, excluded from activity counts.
import { readFileSync } from 'fs';
import { parseMarkRequest, cleanReason, setTestMark, listTestAccountIds, isTestAccount, loadActivityAnalytics } from '../packages/core';
(async () => {
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const mig = R('packages/db/migrations/0069_test_accounts.sql').replace(/--.*$/gm, '');
ok(/create table if not exists test_accounts/.test(mig) && /references users\(id\) on delete cascade/.test(mig) && /enable row level security/.test(mig) && !/create policy/i.test(mig), 'table is server-only (row rules on, no policy) and deleted with the account');
ok(/where not exists \(select 1 from system_changelog/.test(mig), 'changelog row is guarded');
const U = '11111111-1111-1111-1111-111111111111';
ok(parseMarkRequest({ userId: U, mark: true, reason: 'x' })?.mark === true && !parseMarkRequest({ userId: 'x', mark: true }) && !parseMarkRequest({ userId: U, mark: 'yes' }) && !parseMarkRequest(null), 'request is parsed strictly');
ok(!cleanReason('short').ok && cleanReason('  a real reason here ').ok, 'reason of 8 to 200 characters is required');
const route = R('apps/web/app/api/admin/test-accounts/route.ts');
ok(/await requireAdmin\(\)/.test(route) && !/requireAdmin\('/.test(route), 'route is Super Admin only (no team permission)');
ok(route.indexOf('requireAdmin') < route.indexOf('request.json') && (route.match(/writeAudit/g) ?? []).length >= 2 && /outcome: 'success'/.test(route) && /outcome: 'failed'/.test(route), 'gate comes first; success and failure are both audited');
ok(!/password|token|secret/i.test(route.replace(/--.*/g, '')), 'route handles no secret');
// fake db
const mk = (opts: { student?: boolean; err?: any } = {}) => { const marks = new Map<string, any>(); const db: any = { marks, from(t: string) {
  if (t === 'students') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.student === false ? null : { id: 's1' } }) }) }) };
  if (t === 'test_accounts') return {
    upsert: async (row: any) => { if (opts.err) return { error: opts.err }; marks.set(row.user_id, row); return { error: null }; },
    delete: () => ({ eq: async (_c: string, v: string) => { if (opts.err) return { error: opts.err }; marks.delete(v); return { error: null }; } }),
    select: () => { const q: any = { limit: async () => ({ data: [...marks.keys()].map((u) => ({ user_id: u })), error: opts.err ?? null }), eq: (_c: string, v: string) => ({ maybeSingle: async () => ({ data: marks.has(v) ? { user_id: v } : null, error: null }) }) }; return q; } };
  return {}; } }; return db; };
const d = mk();
ok((await setTestMark(d, U, true, 'a@x.in', 'my own test login')).ok && (await isTestAccount(d, U)) && (await listTestAccountIds(d)).has(U), 'mark is saved and read back');
ok((await setTestMark(d, U, false, 'a@x.in', 'my own test login')).ok && !(await isTestAccount(d, U)), 'mark is removed');
const r1: any = await setTestMark(mk({ student: false }), U, true, 'a@x.in', 'my own test login');
ok(!r1.ok && r1.error === 'test_not_a_student', 'only student accounts can be marked');
const r2: any = await setTestMark(mk({ err: { code: '42P01' } }), U, true, 'a@x.in', 'my own test login');
ok(!r2.ok && r2.error === 'test_table_missing' && (await listTestAccountIds(mk({ err: { code: '42P01' } }))).size === 0, 'a missing table is reported plainly and reads stay empty');
const page = R('apps/web/app/admin/accounts/[id]/page.tsx');
ok(/TEST ACCOUNT/.test(page) && /<TestMark/.test(page), 'the account page shows the label and the button');
const comp = R('apps/web/app/admin/accounts/[id]/TestMark.tsx');
ok(/\/api\/admin\/test-accounts/.test(comp) && /label only|changes nothing/i.test(comp), 'button posts to the route and says it changes nothing');
// the mark must never change what an account can do
const code = ['packages/core/test-accounts/logic.ts', 'packages/core/test-accounts/store.ts'].map(R).join('\n');
ok(!/student_access|plan_code|mastery|payments|auth\./.test(code), 'the mark touches no access, plan, mastery, payment or login');
const gate = R('apps/web/lib/admin.ts') + R('apps/web/app/api/auth/login/route.ts');
ok(!/test_accounts|isTestAccount/.test(gate), 'sign-in and the admin gate never look at the mark');
// analytics skip test accounts
const rows = { activity_events: [{ user_id: 'T', event_type: 'login', occurred_at: '2026-11-20T10:00:00Z' }, { user_id: 'R', event_type: 'login', occurred_at: '2026-11-20T10:00:00Z' }],
  users: [{ id: 'T', role: 'student', created_at: '2026-11-20T10:00:00Z' }, { id: 'R', role: 'student', created_at: '2026-11-20T10:00:00Z' }],
  learning_sessions: [{ student_id: 'sT', status: 'completed', started_at: '2026-11-20T10:00:00Z' }, { student_id: 'sR', status: 'completed', started_at: '2026-11-20T10:00:00Z' }],
  ai_usage: [], test_accounts: [{ user_id: 'T' }], students: [{ id: 'sT' }] } as any;
const svc: any = { from(t: string) { const data = rows[t] ?? []; const q: any = { data, error: null, count: data.length };
  const chain: any = new Proxy({}, { get: (_o, k: string) => k === 'then' ? (res: any) => res({ data, error: null }) : k === 'maybeSingle' ? async () => ({ data: data[0] ?? null }) : (..._a: any[]) => chain }); return chain; } };
const rep = await loadActivityAnalytics(svc, 30, new Date('2026-11-22T00:00:00Z'));
ok(rep.signins.available && rep.signins.data!.total === 1 && rep.signins.data!.distinctUsers === 1, 'sign-ins skip the test account');
ok(rep.registrations.available && rep.registrations.data!.total === 1, 'registrations skip the test account');
ok(rep.lessons.available && rep.lessons.data!.started === 1, 'lessons skip the test account');
console.log(`t143: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
