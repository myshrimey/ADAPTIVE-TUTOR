// t145: live page-journey check (v145, TASK-062): page discovery, classification, judging, harmlessness, and an end-to-end run against a stand-in site with planted problems.
import { createServer } from 'http';
import { execFile } from 'child_process';
import { readFileSync } from 'fs';
// @ts-ignore plain JS module
import { collectPages, classifyPage, pageToPath, judgePage, pagesFor, asksToSignIn, ROLES } from '../scripts/live-checks/journeys-lib.mjs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(async () => {
  const pages = collectPages('apps/web/app');
  ok(pages.length >= 160, 'every page in the repo is found');
  const kinds = new Set(pages.map((p: any) => p.kind));
  ok(ROLES.every((r: string) => kinds.has(r)), 'every account type has pages');
  ok(pages.some((p: any) => p.path === '/admin/accounts' && p.kind === 'admin') && pages.some((p: any) => p.path === '/admin/view-as/00000000-0000-0000-0000-000000000000/00000000-0000-0000-0000-000000000000' && p.dynamic), 'recent admin pages are found, dynamic ones marked');
  ok(classifyPage('/tutor/login') === 'public' && classifyPage('/tutor/attention') === 'tutor' && classifyPage('/dashboard') === 'student' && classifyPage('/plans') === 'public' && classifyPage('/admin') === 'admin', 'login pages are public; areas are classified');
  ok(pageToPath('apps/web/app/learn/page.tsx', 'apps/web/app') === '/learn' && pageToPath('apps/web/app/page.tsx', 'apps/web/app') === '/', 'file to address');
  const J = (o: any) => judgePage({ who: 'none', body: '', ...o }).v;
  ok(J({ kind: 'public', status: 200 }) === 'PASS' && J({ kind: 'public', status: 404 }) === 'REVIEW' && J({ kind: 'public', status: 404, dynamic: true }) === 'PASS', 'public pages must open (a made-up id may 404)');
  ok(J({ kind: 'admin', status: 500 }) === 'FAIL' && J({ kind: 'student', status: 0 }) === 'FAIL', 'errors and no answer fail');
  ok(J({ kind: 'student', status: 307 }) === 'PASS' && J({ kind: 'tutor', status: 403 }) === 'PASS', 'private pages that redirect or refuse pass');
  ok(J({ kind: 'admin', status: 200, body: '<h1>Admin sign in</h1>' }) === 'PASS' && J({ kind: 'admin', status: 200, body: '<h1>Accounts</h1><a>Sign in</a>' }) === 'FAIL', 'admin page with content for a visitor FAILS; a header link is not a sign-in heading');
  ok(J({ kind: 'student', status: 200, body: '<h1>Your dashboard</h1>' }) === 'REVIEW', 'student page with content for a visitor is flagged');
  ok(asksToSignIn('<h1 class="x">Sign in</h1>') && !asksToSignIn('<nav><a>Sign in</a></nav><h1>Home</h1>'), 'sign-in heading detection');
  const S = (o: any) => judgePage({ body: '', ...o }).v;
  ok(S({ kind: 'student', who: 'student', status: 200, body: '<h1>Today</h1>' }) === 'PASS' && S({ kind: 'student', who: 'student', status: 200, body: '<h1>Sign in</h1>' }) === 'REVIEW' && S({ kind: 'tutor', who: 'tutor', status: 404 }) === 'REVIEW', 'own pages must open for the right account type');
  ok(S({ kind: 'admin', who: 'student', status: 200, body: '<h1>Accounts</h1>' }) === 'FAIL' && S({ kind: 'admin', who: 'tutor', status: 403 }) === 'PASS' && S({ kind: 'centre', who: 'parent', status: 200, body: '<h1>Centre</h1>' }) === 'REVIEW', 'other account types are refused');
  ok(pagesFor('student', pages).every((p: any) => p.kind === 'admin' || ['parent', 'tutor', 'centre', 'teacher'].includes(p.kind) || (p.kind === 'student' && !p.dynamic)) && pagesFor('tutor', pages).filter((p: any) => p.kind === 'tutor').every((p: any) => !p.dynamic), 'each cookie is tried only on its own pages and on admin and adult areas');
  const script = readFileSync('scripts/live-checks/journeys.mjs', 'utf8');
  ok(!/signInWith|method:\s*'(POST|PUT|PATCH|DELETE)'/.test(script) && !/console\.log\([^)]*cookies/.test(script) && /GET requests/.test(script), 'read only, never signs in, never prints a cookie');
  // stand-in site with planted problems
  const server = createServer((req, res) => {
    const u = (req.url ?? '').split('?')[0]; const ck = req.headers.cookie ?? '';
    const send = (s: number, b = '', h: Record<string, string> = {}) => { res.statusCode = s; for (const k in h) res.setHeader(k, h[k]); res.end(b); };
    if (u === '/admin/accounts') return send(200, '<h1>Accounts</h1>'); // planted: admin page open to everyone
    if (u === '/admin') return send(200, '<h1>Admin sign in</h1>');
    if (u === '/tutor/attention' && ck.includes('student=1')) return send(200, '<h1>Attention</h1>'); // planted: wrong role sees tutor page
    if (u === '/about') return send(500, 'boom'); // planted: public page broken
    if (u === '/learn' && !ck.includes('student=1')) return send(307, '', { location: '/login' });
    if (u === '/learn') return send(200, '<h1>Learn</h1>');
    if (u === '/dashboard') return send(200, '<h1>Your dashboard</h1>'); // planted: private page open to a visitor
    if (/^\/(admin|tutor|centre|teacher|parent)/.test(u)) return send(u.startsWith('/admin') ? 200 : 403, u.startsWith('/admin') ? '<h1>Admin sign in</h1>' : '');
    if (/^\/(learn|profile|progress|report|reports|today|subjects|diagnostic|baseline|mock|review|mistakes|my-|sharing|onboarding|challenge|stretch|battle|friend|leaderboard|achievements|written|board|exam|plan\b|journey)/.test(u)) return send(307, '', { location: '/login' });
    return send(200, '<h1>ok</h1>');
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as any).port;
  const run = (extra: string[]) => new Promise<{ status: number; stdout: string }>((res) => execFile('node', ['scripts/live-checks/journeys.mjs', `http://127.0.0.1:${port}`, ...extra], { encoding: 'utf8', timeout: 170000, env: { ...process.env, LIVE_CHECK_DELAY_MS: '0' } }, (e: any, stdout: string) => res({ status: e ? (e.code ?? 1) : 0, stdout })));
  const r1 = await run([]);
  ok(r1.status === 1 && /FAIL  \[none\] \/admin\/accounts/.test(r1.stdout) && /FAIL  \[none\] \/about|FAIL  \[none\] \/about/.test(r1.stdout) && /REVIEW  \[none\] \/dashboard/.test(r1.stdout), 'signed-out round finds the planted open admin page, broken public page and open student page');
  ok(!/\[none\] \/admin  /.test(r1.stdout) && /Signed-in round skipped/.test(r1.stdout), 'a properly gated admin page is not flagged; the signed-in round is skipped without cookies');
  const r2 = await run(['--cookie', 'student=student=1', '--cookie', 'admin=admin=1']);
  ok(/REVIEW  \[student\] \/tutor\/attention/.test(r2.stdout) && /FAIL  \[student\] \/admin\/accounts/.test(r2.stdout) && /Signed-in round ran for: student, admin/.test(r2.stdout) && !/student=1|admin=1/.test(r2.stdout.replace(/Signed-in round ran for: student, admin/, '')), 'signed-in round catches a student on a tutor page and on an admin page, and never prints a cookie');
  const r3 = await run(['--cookie', 'robot=x']);
  ok(r3.status === 2, 'an unknown account type is refused');
  server.close();
  console.log(`t145: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
