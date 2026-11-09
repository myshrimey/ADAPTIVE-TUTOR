// t110: forgot-password goes through the server with limits (v110).
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { decideResetRequest, RESET_MAX_PER_IP, RESET_MAX_PER_EMAIL, RESET_NEUTRAL_TEXT, RESET_BLOCKED_TEXT } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

ok(decideResetRequest(0, 0).allowed, 'no requests: allowed');
ok(decideResetRequest(RESET_MAX_PER_IP - 1, RESET_MAX_PER_EMAIL - 1).allowed, 'just under both limits: allowed');
ok(!decideResetRequest(RESET_MAX_PER_IP, 0).allowed, 'address limit blocks');
ok(!decideResetRequest(0, RESET_MAX_PER_EMAIL).allowed, 'email limit blocks');
ok(decideResetRequest(NaN, undefined as any).allowed, 'bad numbers never block');
ok(RESET_MAX_PER_EMAIL <= RESET_MAX_PER_IP, 'one email is limited at least as tightly as one address');
ok(/if an account/i.test(RESET_NEUTRAL_TEXT) && !/not found|no account|does not exist/i.test(RESET_NEUTRAL_TEXT), 'neutral text does not reveal whether an account exists');
ok(/hour/.test(RESET_BLOCKED_TEXT), 'blocked text states the wait');

const route = R('apps/web/app/api/auth/forgot-password/route.ts');
ok(route.indexOf('checkResetAllowed(') > -1 && route.indexOf('checkResetAllowed(') < route.indexOf('resetPasswordForEmail'), 'limit is checked BEFORE the reset is requested');
ok(/429/.test(route) && /Retry-After/.test(route), 'blocked answer is 429 with Retry-After');
ok(!/error:\s*(error|err)(\.|\?\.)message/.test(route), 'no raw error returned');
const okBranch = route.slice(route.lastIndexOf('return NextResponse.json({ data: { ok: true'));
ok(!/email/.test(okBranch.replace(/RESET_NEUTRAL_TEXT/, '')), 'success answer does not echo the email');

// A fake database proves counts are per hash and the helper fails open.
(async () => {
  const { checkResetAllowed } = require('../apps/web/lib/password-reset-limit');
  const rows: any[] = [];
  const mk = (boom = false): any => ({ from: () => { const fl: any[] = []; const q: any = {};
    q.select = () => q; q.eq = (c: string, v: any) => (fl.push((r: any) => r[c] === v), q); q.gte = () => q;
    q.insert = async (r: any) => { if (boom) throw new Error('down'); for (const x of [].concat(r as any)) rows.push(x); return { error: null }; };
    q.then = (res: any) => { if (boom) throw new Error('down'); return res({ count: rows.filter((r) => fl.every((g) => g(r))).length, error: null }); };
    return q; } });
  const req = (ip: string) => new Request('http://x/', { headers: { 'x-forwarded-for': ip } });
  const db = mk();
  for (let i = 0; i < RESET_MAX_PER_EMAIL; i++) ok((await checkResetAllowed(db, req('1.1.1.' + i), 'a@x.in')).allowed, `request ${i + 1} for one email allowed`);
  ok(!(await checkResetAllowed(db, req('9.9.9.9'), 'A@x.in ')).allowed, 'next request for the same email (any case) is blocked');
  ok((await checkResetAllowed(db, req('9.9.9.9'), 'b@x.in')).allowed, 'a different email is still allowed');
  ok(rows.every((r) => /^[0-9a-f]{64}$/.test(r.ip_hash)) && !JSON.stringify(rows).includes('a@x.in') && !JSON.stringify(rows).includes('1.1.1.'), 'only hashes stored: no email, no address');
  ok((await checkResetAllowed(mk(true), req('2.2.2.2'), 'c@x.in')).allowed, 'database problem fails open');

  // No browser component may ask Supabase for a reset email directly (it skips the limit).
  const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = join(d, x); if (x === 'node_modules' || x === '.next') return []; return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|js)$/.test(x) ? [p] : []; });
  const bad = walk('apps/web').filter((p) => !p.includes('/app/api/') && /resetPasswordForEmail/.test(R(p)));
  ok(bad.length === 0, `no page/component calls resetPasswordForEmail: ${bad.join(', ')}`);
  ok(/\/api\/auth\/forgot-password/.test(R('apps/web/components/HomeClient.tsx')), 'sign-in page uses the server route');
  ok(!/resetError\.message/.test(R('apps/web/components/HomeClient.tsx')), 'sign-in page does not show a raw reset error');
  console.log(`t110: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
