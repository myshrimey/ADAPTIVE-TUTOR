// t142: live API boundary check script (v142, TASK-060): classification, harmlessness, and an end-to-end run against a stand-in site with planted holes.
import { createServer } from 'http';
import { execFile } from 'child_process';
import { readFileSync } from 'fs';
// @ts-ignore plain JS module
import { judge, routeToPath, methodsOf, collectRoutes, requestFor, isPublicPath, isRoleOnlyPath } from '../scripts/live-checks/lib.mjs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(async () => {
  ok(routeToPath('apps/web/app/api/mock/[id]/sheets/route.ts', 'apps/web/app/api') === '/api/mock/00000000-0000-0000-0000-000000000000/sheets', 'dynamic segments get a dummy id');
  ok(methodsOf("export async function GET() {}\nexport async function DELETE() {}").join() === 'GET,DELETE', 'methods are read from the route file');
  const routes = collectRoutes('apps/web/app/api');
  ok(routes.length >= 140 && routes.every((r: any) => r.methods.length > 0), 'every API route in the repo is found and has a method');
  ok(routes.some((r: any) => r.path === '/api/admin/view-as') && routes.some((r: any) => r.path === '/api/activity/logout'), 'recent routes are included');
  // judge
  const J = (o: any) => judge({ path: '/api/student/export', method: 'GET', who: 'none', ...o }).v;
  ok(J({ status: 0 }) === 'FAIL' && J({ status: 500 }) === 'FAIL' && J({ status: 503 }) === 'FAIL', 'no answer and server errors fail');
  ok(J({ status: 401 }) === 'PASS' && J({ status: 403 }) === 'PASS' && J({ status: 400 }) === 'PASS' && J({ status: 307 }) === 'PASS' && J({ status: 405 }) === 'PASS', 'refusals and redirects pass');
  ok(J({ status: 200, body: '{"data":null,"error":"unauthenticated"}' }) === 'PASS', '200 with no data passes');
  ok(J({ status: 200, body: '{"data":{"name":"x"},"error":null}' }) === 'REVIEW', 'private-looking route answering with data is flagged for review');
  ok(judge({ path: '/api/admin/control', method: 'GET', status: 200, body: '{"data":{"a":1},"error":null}', who: 'none' }).v === 'FAIL', 'admin route answering a signed-out caller with data FAILS');
  ok(judge({ path: '/api/admin/control', method: 'GET', status: 200, body: '{"data":{"a":1}}', who: 'student' }).v === 'FAIL', 'admin route answering a student FAILS');
  ok(judge({ path: '/api/track', method: 'POST', status: 200, body: '{"data":{"ok":true},"error":null}', who: 'none' }).v === 'PASS', 'a route meant to be public passes');
  ok(judge({ path: '/api/me', method: 'GET', status: 200, body: '{"data":{"email":"a@b.c","role":"admin"}}', who: 'none' }).v !== 'PASS', '/api/me must not show a person to a signed-out caller');
  ok(isPublicPath('/api/auth/login') && !isPublicPath('/api/admin/control') && isRoleOnlyPath('/api/portal/x') && isRoleOnlyPath('/api/admin/a') && !isRoleOnlyPath('/api/session/start'), 'public and role-only lists');
  // harmless by construction
  ok(Object.keys(requestFor('GET')).length === 0 && requestFor('POST').body === 'not json' && requestFor('DELETE').body === 'not json', 'only reads; every other method gets an invalid body');
  const script = readFileSync('scripts/live-checks/api-boundaries.mjs', 'utf8');
  ok(!/signInWith|password/i.test(script.replace(/No password is tried\./, '')) && !/console\.log\([^)]*studentCookie/.test(script), 'the script never signs in, tries no password and never prints the cookie');
  // end to end against a stand-in site with planted problems
  const server = createServer((req, res) => {
    const u = (req.url ?? '').split('?')[0];
    const send = (s: number, b: string) => { res.statusCode = s; res.setHeader('content-type', 'application/json'); res.end(b); };
    if (u === '/api/admin/control' && req.method === 'POST') return send(200, '{"data":{"secret":1},"error":null}'); // planted hole
    if (u === '/api/teacher/queue' && req.headers.cookie?.includes('student=1')) return send(200, '{"data":{"classes":[1]},"error":null}'); // planted: wrong role gets data
    if (u === '/api/report' && req.method === 'GET') return send(200, '{"data":{"x":1},"error":null}'); // planted: private-looking, answers
    if (u === '/api/baseline/start' && req.method === 'POST') return send(500, '{"error":"boom"}'); // planted: server error
    return send(u.startsWith('/api/auth') ? 400 : 401, '{"data":null,"error":"unauthenticated"}');
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as any).port;
  const run = (extra: string[]) => new Promise<{ status: number; stdout: string }>((res) => execFile('node', ['scripts/live-checks/api-boundaries.mjs', `http://127.0.0.1:${port}`, ...extra], { encoding: 'utf8', timeout: 100000, env: { ...process.env, LIVE_CHECK_DELAY_MS: '0' } }, (err: any, stdout: string) => res({ status: err ? (err.code ?? 1) : 0, stdout })));
  const r1 = await run([]);
  ok(r1.status === 1 && /FAIL  \[none\] POST \/api\/admin\/control/.test(r1.stdout) && /REVIEW  \[none\] GET \/api\/report/.test(r1.stdout) && /FAIL  \[none\] POST \/api\/baseline\/start.*server error 500/.test(r1.stdout), 'end to end: planted hole, review item and server error are all reported, exit code 1');
  ok(/FAIL  \[forged\] POST \/api\/admin\/control/.test(r1.stdout) && /Tier 3 \(wrong role\) skipped/.test(r1.stdout), 'the forged-session round runs; tier 3 is skipped without a cookie');
  const r2 = await run(['--student-cookie', 'student=1']);
  ok(/FAIL  \[student\] GET \/api\/teacher\/queue/.test(r2.stdout) && !r2.stdout.includes('student=1'), 'wrong-role round catches a student reading a teacher route and never prints the cookie');
  server.close();
  console.log(`t142: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
