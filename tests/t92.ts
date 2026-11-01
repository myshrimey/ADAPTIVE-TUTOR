// t92: read-only account directory and snapshot (v92): masking, filters, read-only proof, audit lines, no impersonation.
import { readFileSync } from 'fs';
import { fakeDb } from './fakedb2';
import { maskEmail, initials, shortId, accessState, cleanFilter, filterAccounts, collapseEvents, sortTimeline, loadDirectory, loadSnapshot, auditDirectoryView, type AccountRow } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const NOW = new Date('2026-10-31T12:00:00Z');
const ago = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();

(async () => {
  // ---- masking
  ok(maskEmail('aarav.sharma@gmail.com') === 'aa***@gmail.com', 'email is masked');
  ok(!maskEmail('aarav.sharma@gmail.com').includes('sharma'), 'mask hides the name part');
  ok(maskEmail('a@x.in') === 'a***@x.in', 'one-letter name still masked');
  ok(maskEmail('nonsense') === '***' && maskEmail('') === '' && maskEmail(null) === '', 'odd input is safe');
  ok(initials('Aarav Kumar Sharma') === 'A. K. S.' && initials('') === '' && initials('  ravi  ') === 'R.', 'initials only');
  ok(shortId('0123456789abcdef') === '01234567', 'short id');
  ok(accessState(false, null, '2026-10-31') === 'no_access' && accessState(true, '2026-10-30', '2026-10-31') === 'expired' && accessState(true, '2026-10-31', '2026-10-31') === 'active' && accessState(true, null, '2026-10-31') === 'active', 'access states');

  // ---- filter cleaning
  const c = cleanFilter({ kind: 'hacker', plan: "pro'; drop", status: 'ACTIVE!', from: 'x', to: '2026-01-02', activity: '99', q: ' ABC ' });
  ok(c.kind === '' && c.plan === 'prodrop' && c.status === '', 'bad filter values are cleaned');
  ok(c.from === '' && c.to === '2026-01-02' && c.activity === '' && c.q === 'abc', 'dates, activity and search are cleaned');

  // ---- fake data
  const T: Record<string, any[]> = {
    users: [
      { id: 'u-stu-active-0001', auth_user_id: 'a1', email: 'aarav.sharma@gmail.com', role: 'student', created_at: ago(40), source: 'google' },
      { id: 'u-stu-expired-0002', auth_user_id: 'a2', email: 'meera.rao@gmail.com', role: 'student', created_at: ago(100), source: null },
      { id: 'u-stu-never--0003', auth_user_id: 'a3', email: 'kabir@yahoo.in', role: 'student', created_at: ago(3), source: null },
      { id: 'u-parent---0004', auth_user_id: 'a4', email: 'sunita.sharma@gmail.com', role: 'parent', created_at: ago(39), source: null },
      { id: 'u-teacher--0005', auth_user_id: 'a5', email: 'mr.gupta@school.edu', role: 'teacher', created_at: ago(20), source: null },
    ],
    students: [
      { id: 's1', user_id: 'u-stu-active-0001', display_name: 'Aarav Sharma', grade: 'CBSE-10' },
      { id: 's2', user_id: 'u-stu-expired-0002', display_name: 'Meera Rao', grade: 'CBSE-10' },
      { id: 's3', user_id: 'u-stu-never--0003', display_name: 'Kabir Singh', grade: 'CBSE-10' },
    ],
    student_access: [
      { student_id: 's1', plan_code: 'pro', access_until: '2027-03-01', subject_limit: 3, granted_at: ago(39), updated_at: ago(10) },
      { student_id: 's2', plan_code: 'free', access_until: '2026-09-01', subject_limit: 1, granted_at: ago(99), updated_at: ago(99) },
    ],
    adult_profiles: [{ user_id: 'u-parent---0004', role: 'parent', display_name: 'Sunita Sharma', status: 'active' }],
    teacher_profiles: [{ user_id: 'u-teacher--0005', display_name: 'Rakesh Gupta', status: 'approved' }],
    student_links: [{ student_id: 's1', adult_user_id: 'u-parent---0004', link_type: 'parent', status: 'active', created_at: ago(38), revoked_at: null }],
    pilot_payments: [{ student_id: 's1', amount: 499, status: 'confirmed', created_at: ago(39) }],
    test_reports: [{ student_id: 's1', audience: 'adult', kind: 'diagnostic', score: 12, total: 20, taken_at: ago(30) }, { student_id: 's1', audience: 'student', kind: 'mock', score: 1, total: 2, taken_at: ago(1) }],
    learning_events: [
      { student_id: 's1', event_type: 'answer_submitted', created_at: ago(1), payload: { answer: 'SECRET ANSWER TEXT' } },
      { student_id: 's1', event_type: 'answer_submitted', created_at: ago(1), payload: {} },
      { student_id: 's1', event_type: 'session_started', created_at: ago(50) },
      { student_id: 's2', event_type: 'session_started', created_at: ago(60) },
    ],
    account_devices: [{ auth_user_id: 'a1', device_id: 'd1', first_seen: ago(39), last_seen: ago(2), ip: '1.2.3.4', user_agent: 'UA-SECRET' }],
    subjects: [{ id: 'sub1', name: 'Mathematics', slug: 'maths' }],
    learning_goals: [{ student_id: 's1', subject_id: 'sub1', status: 'active' }],
    audit_logs: [],
  };
  const before = JSON.stringify({ ...T, audit_logs: undefined });
  const db: any = fakeDb(T);

  // ---- directory
  const all = await loadDirectory(db, cleanFilter({}), NOW);
  ok(all.total === 5 && all.rows.length === 5, 'directory lists every account');
  const dump = JSON.stringify(all);
  ok(!/sharma@|meera\.rao|kabir@|mr\.gupta|sunita\./i.test(dump), 'no full email in the directory result');
  ok(!/Aarav Sharma|Meera Rao|Kabir Singh|Sunita Sharma|Rakesh Gupta/.test(dump), 'no full name in the directory result');
  ok(all.rows.find((r) => r.shortId === 'u-stu-ac')?.status === 'active' && all.rows.find((r) => r.shortId === 'u-stu-ex')?.status === 'expired', 'student status comes from the access end date');
  ok(all.rows.find((r) => r.kind === 'parent')?.status === 'active' && all.rows.find((r) => r.kind === 'teacher')?.status === 'approved', 'adult and teacher status come from their profiles');
  ok(all.rows.find((r) => r.shortId === 'u-stu-ac')?.lastActivity === T.learning_events[0].created_at, 'last activity is the newest learning event');
  const byKind = await loadDirectory(db, cleanFilter({ kind: 'student' }), NOW);
  ok(byKind.rows.length === 3, 'filter by type');
  ok((await loadDirectory(db, cleanFilter({ plan: 'pro' }), NOW)).rows.length === 1, 'filter by plan');
  ok((await loadDirectory(db, cleanFilter({ status: 'expired' }), NOW)).rows.length === 1, 'filter by status');
  ok((await loadDirectory(db, cleanFilter({ from: ago(45).slice(0, 10), to: ago(30).slice(0, 10) }), NOW)).rows.length === 2, 'filter by registration date range');
  ok((await loadDirectory(db, cleanFilter({ activity: '7d' }), NOW)).rows.length === 1, 'filter: active in 7 days');
  ok((await loadDirectory(db, cleanFilter({ activity: 'stale' }), NOW)).rows.length === 1, 'filter: quiet for over 30 days');
  ok((await loadDirectory(db, cleanFilter({ activity: 'never' }), NOW)).rows.length === 3, 'filter: no learning recorded (never-active student + adults)');
  ok((await loadDirectory(db, cleanFilter({ q: 'meera.rao' }), NOW)).rows.length === 1, 'search by email works but shows only masked data');
  ok((await loadDirectory(db, cleanFilter({ q: 'u-parent' }), NOW)).rows.length === 1, 'search by id');
  ok((await loadDirectory(db, cleanFilter({ q: 'zzzz' }), NOW)).rows.length === 0, 'no match');

  // ---- snapshot
  const snap = await loadSnapshot(db, 'u-stu-active-0001', 'founder@x.in', NOW);
  ok(snap.found && snap.kind === 'student' && snap.plan === 'pro' && snap.status === 'active' && snap.subjectLimit === 3, 'snapshot: plan and access');
  ok(snap.subjects.join() === 'Mathematics', 'snapshot: subjects');
  ok(snap.links.length === 1 && snap.links[0].initials === 'S. S.' && snap.links[0].type === 'parent', 'snapshot: linked adult shown by initials');
  ok(snap.payments.length === 1 && snap.payments[0].amount === 499, 'snapshot: payment claim');
  ok(snap.reports === 1, 'snapshot: only the adult copy of reports is counted');
  ok(snap.devices === 1, 'snapshot: device count');
  const sd = JSON.stringify(snap);
  ok(!/SECRET ANSWER|UA-SECRET|1\.2\.3\.4/.test(sd), 'no answer text, browser string or IP address in the snapshot');
  ok(!/Aarav Sharma|sharma@gmail/.test(sd), 'no full name or email in the snapshot');
  ok(snap.timeline.length >= 6 && snap.timeline.every((t, i, a) => i === 0 || t.at <= a[i - 1].at), 'timeline is newest first');
  ok(snap.timeline.some((t) => /Learning: answer submitted/.test(t.what) && t.detail === '2 times that day'), 'learning events are collapsed to counts per day');
  ok(!snap.timeline.some((t) => /session started/.test(t.what) && t.at.slice(0, 10) === ago(50).slice(0, 10)), 'learning events older than 30 days are left out');
  ok(snap.lastActivity === T.learning_events[0].created_at, 'snapshot last activity');
  const par = await loadSnapshot(db, 'u-parent---0004', 'founder@x.in', NOW);
  ok(par.kind === 'parent' && par.links.length === 1 && par.links[0].who === 'Linked student' && par.links[0].initials === 'A. S.', 'adult snapshot lists linked student by initials');
  const none = await loadSnapshot(db, 'does-not-exist', 'founder@x.in', NOW);
  ok(!none.found, 'unknown account is not found');
  await auditDirectoryView(db, 'founder@x.in', cleanFilter({ q: 'secret-search@x.in', kind: 'student' }), 3);

  // ---- read-only proof: nothing outside audit_logs changed
  ok(JSON.stringify({ ...T, audit_logs: undefined }) === before, 'no table other than audit_logs was changed');
  const aud = T.audit_logs;
  ok(aud.filter((a) => a.action === 'account.view' && a.outcome === 'success').length === 2, 'each account opened is recorded');
  ok(aud.some((a) => a.action === 'account.view' && a.outcome === 'failed' && a.target_account === 'does-not-exist'), 'a failed lookup is recorded');
  ok(aud.find((a) => a.action === 'account.view')?.target_account === 'u-stu-active-0001' && aud.find((a) => a.action === 'account.view')?.actor_email === 'founder@x.in', 'audit line names the actor and the account');
  const dv = aud.find((a) => a.action === 'account.directory_view');
  ok(!!dv && !/secret-search/.test(JSON.stringify(dv)) && /search used/.test(JSON.stringify(dv)), 'directory audit line never keeps the search text');
  ok(!/@gmail|@yahoo|@school/.test(JSON.stringify(aud)), 'no email address in any audit line');

  // ---- pure helpers
  ok(collapseEvents([{ event_type: 'a_b', created_at: '2026-10-01T01:00:00Z' }, { event_type: 'a_b', created_at: '2026-10-01T02:00:00Z' }, { event_type: 'c', created_at: '' }]).length === 1, 'collapse groups by day and type, skips bad rows');
  ok(sortTimeline([{ at: 'bad', what: 'x' }, { at: '2026-01-01T00:00:00Z', what: 'old' }, { at: '2026-02-01T00:00:00Z', what: 'new' }]).map((t) => t.what).join() === 'new,old', 'timeline sorts and drops bad dates');
  const rows: AccountRow[] = [];
  ok(filterAccounts(rows, cleanFilter({}), NOW).length === 0, 'empty list is fine');

  // ---- static: read only, no impersonation, gated
  const store = R('packages/core/accounts/store.ts').replace(/\/\/.*$/gm, '');
  ok(!/\.(insert|update|delete|upsert)\(/.test(store), 'store never writes (only the audit helper does)');
  ok(!/auth\.admin|signIn|setSession|createSession|generateLink|impersonat/i.test(store), 'store never creates a session as another person');
  for (const p of ['apps/web/app/admin/accounts/page.tsx', 'apps/web/app/admin/accounts/[id]/page.tsx']) {
    const s = R(p);
    ok(/adminPageGate\(\)/.test(s), `Super Admin only: ${p}`);
    ok(!/^['"]use client['"]/.test(s.trim()) && !/<form[^>]*method=["']post/i.test(s) && !/fetch\(/.test(s), `no write path in ${p}`);
    ok(!/\.email\b/.test(s.replace(/g\.email/g, '')), `page never prints a raw email: ${p}`);
  }
  ok(/\/admin\/accounts/.test(R('apps/web/lib/admin-menu.ts')), 'directory is in the admin menu');
  ok(!/\/admin\/accounts/.test(R('packages/core/admin-team/permissions.ts')), 'no team permission opens the directory (decision D6 still open)');

  console.log(`t92: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
