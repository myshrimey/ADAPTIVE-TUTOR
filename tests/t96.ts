// t96: sign-in brute-force protection (v96).
import { readFileSync } from 'fs';
import { decideLogin, normaliseLoginKey, LOGIN_MAX_FAILS_PER_ACCOUNT, LOGIN_MAX_FAILS_PER_IP, LOGIN_WINDOW_MINUTES, LOGIN_BLOCKED_TEXT } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

// ---- pure rules
ok(decideLogin(0, 0).allowed && decideLogin(LOGIN_MAX_FAILS_PER_ACCOUNT - 1, LOGIN_MAX_FAILS_PER_IP - 1).allowed, 'just under the limits is allowed');
ok(!decideLogin(LOGIN_MAX_FAILS_PER_ACCOUNT, 0).allowed, 'account limit blocks');
ok(!decideLogin(0, LOGIN_MAX_FAILS_PER_IP).allowed, 'address limit blocks');
const d: any = decideLogin(99, 0);
ok(d.reason === 'too_many_attempts' && d.retryAfterSeconds === LOGIN_WINDOW_MINUTES * 60, 'blocked answer names the reason and wait');
ok(decideLogin(NaN, undefined as any).allowed, 'bad numbers never lock anyone out');
ok(LOGIN_MAX_FAILS_PER_ACCOUNT < LOGIN_MAX_FAILS_PER_IP, 'one address (a school) may hold several accounts, so its limit is higher');
ok(normaliseLoginKey('  RAHUL@X.in ') === 'rahul@x.in' && normaliseLoginKey('Rahul') === normaliseLoginKey(' rahul '), 'same account typed differently counts once');
ok(!/lock|ban|suspend|blame|attack|hack/i.test(LOGIN_BLOCKED_TEXT) && /15 minutes/.test(LOGIN_BLOCKED_TEXT), 'neutral wording, states the wait');

// ---- helper behaviour with a fake database
(async () => {
  const { checkLoginAllowed, recordLoginFailure, clearLoginFailures, keyHash } = require('../apps/web/lib/login-throttle');
  const rows: any[] = [];
  const mk = (boom = false, errored = false): any => ({ from: (_t: string) => {
    const q: any = { _f: [] as any[], _m: 'select' };
    q.select = () => q; q.eq = (c: string, v: any) => (q._f.push((r: any) => r[c] === v), q); q.gte = () => q; q.lt = (c: string, v: any) => (q._f.push((r: any) => r[c] < v), q);
    q.insert = async (r: any) => { if (boom) throw new Error('down'); rows.push({ ...r, created_at: new Date().toISOString() }); return { error: null }; };
    q.delete = () => { q._m = 'delete'; return q; };
    q.then = (res: any) => { if (boom) throw new Error('down'); if (errored) return res({ count: 0, error: { message: 'nope' } });
      const m = rows.filter((r) => q._f.every((fn: any) => fn(r)));
      if (q._m === 'delete') { for (const r of m) rows.splice(rows.indexOf(r), 1); return res({ error: null }); }
      return res({ count: m.length, error: null }); };
    return q; } });
  const req = (ip: string): any => ({ headers: { get: (k: string) => (k === 'x-forwarded-for' ? ip : null) } });
  const db = mk();
  for (let i = 0; i < LOGIN_MAX_FAILS_PER_ACCOUNT; i++) { ok((await checkLoginAllowed(db, 'Rahul', req('1.1.1.1'))).allowed, `try ${i + 1} is allowed`); await recordLoginFailure(db, ' rahul ', req('1.1.1.1')); }
  ok(!(await checkLoginAllowed(db, 'RAHUL', req('9.9.9.9'))).allowed, 'after the limit the account waits, even from another address');
  ok((await checkLoginAllowed(db, 'someone-else', req('9.9.9.9'))).allowed, 'another account is not affected');
  await clearLoginFailures(db, 'rahul');
  ok((await checkLoginAllowed(db, 'rahul', req('9.9.9.9'))).allowed, 'a correct sign-in clears the failures');
  const s = JSON.stringify(rows);
  rows.length = 0; await recordLoginFailure(db, 'secret.name@school.in', req('203.0.113.7'));
  const stored = JSON.stringify(rows);
  ok(!/secret|school|203\.0\.113|password/i.test(stored) && rows[0].key_hash === keyHash('secret.name@school.in') && /^[0-9a-f]{64}$/.test(rows[0].ip_hash), 'only one-way hashes are stored: no name, email, address or password');
  ok((await checkLoginAllowed(mk(true), 'a', req('1.1.1.1'))).allowed && (await checkLoginAllowed(mk(false, true), 'a', req('1.1.1.1'))).allowed, 'a database problem never locks anyone out');
  let threw = false; try { await recordLoginFailure(mk(true), 'a', req('1')); await clearLoginFailures(mk(true), 'a'); } catch { threw = true; }
  ok(!threw, 'recording and clearing never throw');

  // ---- the route is wired in the right order
  const r = R('apps/web/app/api/auth/login/route.ts');
  const iCheck = r.indexOf('checkLoginAllowed('), iPw = r.indexOf('signInWithPassword'), iRec = r.indexOf('recordLoginFailure('), iClear = r.indexOf('clearLoginFailures(');
  ok(iCheck > 0 && iCheck < iPw, 'the limit is checked BEFORE the password is tried');
  ok(iRec > iPw && iClear > iRec, 'a failure is recorded after a wrong password; success clears');
  ok(/status: 429/.test(r) && /Retry-After/.test(r), 'blocked answer is HTTP 429 with Retry-After');
  ok(!/recordLoginFailure[^\n]*\n[^\n]*wrong_portal/.test(r) && r.indexOf('wrong_portal') > iClear, 'a right password in the wrong portal is not counted as an attack');
  // ---- every sign-in form goes through the server route and shows the wait message
  for (const p of ['apps/web/components/AdminSignIn.tsx', 'apps/web/components/HomeClient.tsx', 'apps/web/components/portal/PortalLoginForm.tsx'])
    ok(/LOGIN_BLOCKED_TEXT/.test(R(p)), `${p} shows the wait message`);
  const clientFiles = R('apps/web/components/AdminSignIn.tsx') + R('apps/web/components/HomeClient.tsx') + R('apps/web/components/portal/PortalLoginForm.tsx') + R('apps/web/components/invite/InviteForm.tsx');
  ok(!/signInWithPassword/.test(clientFiles), 'no sign-in form talks to Supabase passwords directly (that would skip the limit)');
  // ---- migration text
  const m = R('packages/db/migrations/0058_login_throttle.sql');
  ok(/enable row level security/.test(m) && !/create policy/i.test(m), 'server-only: RLS on, no policy');
  const tbl = m.slice(m.indexOf('create table'), m.indexOf(');', m.indexOf('create table')));
  ok(!/username|email|password|\bip\s/i.test(tbl) && /key_hash/.test(tbl) && /ip_hash/.test(tbl), 'table has no name, email, password or plain address column');
  ok(/create table if not exists/.test(m) && /where not exists/.test(m), 'migration is re-runnable');
  console.log(`t96: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
