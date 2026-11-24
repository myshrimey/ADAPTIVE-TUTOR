#!/usr/bin/env node
// Sahayak live API boundary check (v142, TASK-060). Calls EVERY API route of the repo on your running site and checks who can get an answer.
//   Tier 1  signed out            every route, every method
//   Tier 2  forged / expired      the same, with a made-up session cookie and token (what an expired or tampered session looks like)
//   Tier 3  wrong role (optional) a TEST student's cookie against admin, teacher, centre and portal routes
// Safe by design: GET requests only read; every other method is sent an INVALID body, so nothing can be created or changed. No password is tried.
// It cannot sign in. For tier 3 you paste a TEST student's cookie (never a real family's or your own admin cookie). The cookie is never printed.
//   node scripts/live-checks/api-boundaries.mjs https://your-site.example [--student-cookie "name=value; name2=value2"]
import { collectRoutes, judge, requestFor, FORGED_HEADERS, isRoleOnlyPath } from './lib.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || '').replace(/\/+$/, '');
const ci = args.indexOf('--student-cookie');
const studentCookie = ci >= 0 ? args[ci + 1] : '';
if (!base) { console.error('Usage: node scripts/live-checks/api-boundaries.mjs https://your-site.example [--student-cookie "..."]'); process.exit(2); }
const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'web', 'app', 'api');
const routes = collectRoutes(apiRoot);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const counts = { PASS: 0, REVIEW: 0, FAIL: 0 }; const flagged = [];

async function call(r, method, who, headers) {
  const init = requestFor(method);
  let status = 0, body = '';
  try {
    const res = await fetch(base + r.path, { redirect: 'manual', ...init, headers: { ...(init.headers || {}), ...headers } });
    status = res.status; body = status >= 200 && status < 300 ? (await res.text()).slice(0, 4000) : '';
  } catch { /* status 0 */ }
  const j = judge({ path: r.path, method, status, body, who });
  counts[j.v]++;
  if (j.v !== 'PASS') flagged.push(`${j.v}  [${who}] ${method} ${r.path}  ${j.why}`);
  await sleep(Number(process.env.LIVE_CHECK_DELAY_MS ?? 120)); // a polite pause so a real site is not hammered
}

console.log(`Checking ${routes.length} routes on ${base}`);
for (const r of routes) for (const m of r.methods) await call(r, m, 'none', {});
for (const r of routes) for (const m of r.methods) await call(r, m, 'forged', FORGED_HEADERS);
if (studentCookie) { for (const r of routes.filter((x) => isRoleOnlyPath(x.path))) for (const m of r.methods) await call(r, m, 'student', { cookie: studentCookie }); }
else console.log('Tier 3 (wrong role) skipped: no --student-cookie given.');

console.log('\n' + (flagged.length ? flagged.join('\n') : 'Nothing flagged.'));
console.log(`\nPASS ${counts.PASS}   REVIEW ${counts.REVIEW}   FAIL ${counts.FAIL}`);
console.log('REVIEW = the route answered a signed-out caller with data: fine if it is meant to be public, a hole if not. FAIL = a server error, no answer, or role-only data given to the wrong caller.');
process.exit(counts.FAIL ? 1 : 0);
