#!/usr/bin/env node
// Sahayak smoke test (v112). READ-ONLY: it opens public pages and checks that private ones refuse a signed-out visitor.
// It creates no account, sends no email, writes nothing. Run:  node scripts/smoke/smoke-test.mjs https://your-site.example
// It does NOT replace walking the journey by hand (docs/LIVE_JOURNEY_CHECKLIST.md): it cannot sign in.
const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) { console.error('Usage: node scripts/smoke/smoke-test.mjs https://your-site.example'); process.exit(2); }
let pass = 0, fail = 0; const failures = [];
const note = (ok, name, detail = '') => { ok ? pass++ : (fail++, failures.push(name)); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const get = async (p, opt = {}) => { try { return await fetch(base + p, { redirect: 'manual', ...opt }); } catch (e) { return { status: 0, headers: new Headers(), text: async () => '' }; } };
const REDIRECT_OR_REFUSE = [301, 302, 303, 307, 308, 401, 403];

// 1. Public pages open.
for (const p of ['/', '/plans', '/about', '/help', '/check', '/sample-report', '/contact', '/trust', '/portals', '/reset-password']) {
  const r = await get(p); note(r.status === 200, `public page ${p} opens`, `status ${r.status}`);
}
// 2. Private pages refuse a signed-out visitor (a redirect to sign-in or a refusal; never the page itself).
for (const p of ['/admin', '/admin/control', '/admin/accounts', '/admin/feedback', '/admin/deploy-check']) {
  const r = await get(p); const loc = r.headers.get('location') || '';
  note(REDIRECT_OR_REFUSE.includes(r.status) || (r.status === 200 && /Admin sign in/.test(await r.text())), `private page ${p} is not shown signed out`, `status ${r.status} ${loc}`);
}
// 3. Private APIs refuse a signed-out caller.
for (const p of ['/api/admin/control', '/api/admin/feedback/attachment?id=x', '/api/student/export', '/api/me']) {
  const r = await get(p); const t = r.status === 200 ? await r.text() : '';
  // a signed-out caller must never get 200 with student or admin data (/api/me may answer 200 with no person in it)
  note(r.status !== 0 && (r.status !== 200 || (p === '/api/me' && !/"email"|"role":"(admin|student|parent)/.test(t))), `private API ${p} gives a signed-out caller nothing`, `status ${r.status}`);
}
// 4. Sign-in and sign-up routes only accept POST.
for (const p of ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password']) {
  const r = await get(p); note(r.status === 405, `${p} refuses a plain GET`, `status ${r.status}`);
}
// 5. Forgot-password: bad input is refused WITHOUT sending anything.
{ const r = await get('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'not-an-email' }) });
  note(r.status === 400, 'forgot-password refuses a bad email', `status ${r.status}`); }
// 6. Sign-in with nothing typed is refused (no password is tried).
{ const r = await get('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  note(r.status === 400, 'sign-in with nothing typed is refused', `status ${r.status}`); }
// 7. The free check never sends answer keys.
{ const r = await get('/api/public/check?subject=maths'); const t = await r.text();
  note(r.status !== 0 && !/"(expected|correct_answer|answer_key|explanation)"/.test(t), 'free check response holds no answer key or explanation', `status ${r.status}`); }
// 8. Installable web app files exist, and the service worker file is served.
{ const m = await get('/manifest.webmanifest'); note(m.status === 200, 'manifest opens', `status ${m.status}`);
  const s = await get('/sw.js'); note(s.status === 200, 'sw.js opens', `status ${s.status}`); }
// 9. Basic safety headers (informational: a FAIL here is a suggestion, not a break).
{ const r = await get('/'); const h = r.headers; note(h.get('x-content-type-options') === 'nosniff' && !!h.get('x-frame-options') && !!h.get('referrer-policy'), 'browser safety headers are present (nosniff, frame, referrer)', ''); }

console.log(`\n${pass} passed, ${fail} failed.${fail ? ' Failed: ' + failures.join('; ') : ''}`);
console.log('This checked only what a signed-out visitor can see. It did not sign in, send email, or open signed-in pages.');
process.exit(fail ? 1 : 0);
