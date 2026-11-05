// t97: every NON-admin API route either identifies its caller or is on a written public list (v97). Extends t91 (admin routes).
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const API = 'apps/web/app/api';
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? walk(p) : p.endsWith('route.ts') ? [p] : []; });
const routes = walk(API).filter((p) => !p.startsWith(API + '/admin/')).sort();
const rel = (p: string) => p.slice(API.length + 1).replace(/\/route\.ts$/, '');

// A route that names who is calling (a signed-in student, adult, teacher, contributor, admin) is gated by that helper.
const IDENTITY = /getCurrentStudentId|requireAdmin|getAdminUser|requireApprovedTeacher|getPortalUser|getContributor|getMe\b|auth\.getUser\(/;
// Routes that are public ON PURPOSE. kind: signup (limits + switch), token (needs an unguessable invitation token),
// read (public read-only, no write), rls (uses the caller's own session client, never the service key).
const PUBLIC: Record<string, { kind: 'signup' | 'token' | 'read' | 'rls'; why: string }> = {
  'auth/register': { kind: 'signup', why: 'family self sign-up' },
  'auth/register-family': { kind: 'signup', why: 'family + child sign-up' },
  'portal/register': { kind: 'signup', why: 'parent / tutor / centre sign-up' },
  'teacher/register': { kind: 'signup', why: 'teacher sign-up (pending until the founder approves)' },
  'invite/accept': { kind: 'token', why: 'invitation form; role comes from the invitation row' },
  'invite/started': { kind: 'token', why: 'funnel step; reveals nothing' },
  'commerce/quote': { kind: 'read', why: 'price quote computed on the server' },
  'public/check': { kind: 'read', why: 'free readiness check; answer keys never sent' },
  'public/config': { kind: 'read', why: 'public site settings' },
  'curriculum': { kind: 'rls', why: 'reads through the caller session (RLS)' },
  'curriculum/topics/[topicId]': { kind: 'rls', why: 'reads through the caller session (RLS)' },
  'diagnostic/result/[attemptId]': { kind: 'rls', why: 'reads through the caller session (RLS)' },
};
const WRITES = /\.(insert|update|upsert|delete)\(|auth\.admin\./;

ok(routes.length > 80, `scanned ${routes.length} non-admin routes`);
const open: string[] = [];
for (const p of routes) {
  const r = rel(p), src = R(p);
  if (IDENTITY.test(src)) continue;
  const pub = PUBLIC[r];
  if (!pub) { open.push(r); continue; }
  if (pub.kind === 'signup') {
    ok(/signupsOpen\(\)/.test(src), `${r}: honours the sign-up on/off switch`);
    ok(/checkSignupLimits\(|signup_log/.test(src), `${r}: has per-address and daily limits`);
    ok(/website/.test(src), `${r}: has the hidden bot field`);
  }
  if (pub.kind === 'token') ok(/lookupToken\(/.test(src), `${r}: checks the invitation token first`);
  if (pub.kind === 'read') ok(!WRITES.test(src), `${r}: public but read-only`);
  if (pub.kind === 'rls') ok(/createServerClient/.test(src) && !/createServiceClient\(/.test(src), `${r}: session client only, no service key`);
}
ok(open.length === 0, `no route is open without being on the public list: ${open.join(', ')}`);
for (const k of Object.keys(PUBLIC)) ok(routes.some((p) => rel(p) === k), `public list entry ${k} still exists (remove stale entries)`);
ok(Object.values(PUBLIC).every((v) => v.why.length > 8), 'every public route has a written reason');

// Sign-in goes through the limit; no browser component asks Supabase for a password session directly.
ok(/checkLoginAllowed\(/.test(R(API + '/auth/login/route.ts')), 'login is limited');

// Server errors must not carry the raw reason to the browser on sign-up routes (the reason stays in the server log).
for (const r of ['auth/register', 'auth/register-family', 'portal/register', 'teacher/register', 'auth/login'])
  ok(!/error:\s*err(\.|\?\.)message/.test(R(`${API}/${r}/route.ts`)), `${r}: does not return a raw error message`);

// No non-admin route may echo a raw error message (use publicError from the core package).
const leaky = routes.filter((p) => /error:\s*\(?\s*(err|e)(\.|\?\.)message(?!\s*===)/.test(R(p))).length;
const LEAKY_BASELINE = 0; // v98: all non-admin routes now use publicError(); it must stay zero
ok(leaky <= LEAKY_BASELINE, `routes echoing a raw error message: ${leaky} (must not exceed ${LEAKY_BASELINE}; lower the number when you fix some)`);
console.log(`(info) raw-error routes: ${leaky}, public routes listed: ${Object.keys(PUBLIC).length}`);
console.log(`t97: ${n - f}/${n} passed`); if (f) process.exit(1);
