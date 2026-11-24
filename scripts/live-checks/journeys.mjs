#!/usr/bin/env node
// Sahayak live page-journey check (v145, TASK-062). Opens every page of the repo on your running site, for each account type.
//   Round 1  signed out and forged session: public pages open; student/parent/tutor/centre/teacher/admin pages refuse.
//   Round 2  (optional) one cookie per account type, from TEST accounts: each type opens its own pages, and is refused on the admin and adult areas of the others.
// Read only: GET requests, nothing is clicked, typed or submitted. It cannot sign in and tries no password. Cookies are only sent to your site and never printed.
//   node scripts/live-checks/journeys.mjs https://your-site.example [--cookie student="name=value; n2=v2"] [--cookie admin="..."] ...
import { collectPages, judgePage, pagesFor, ROLES } from './journeys-lib.mjs';
import { FORGED_HEADERS } from './lib.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || '').replace(/\/+$/, '');
if (!base) { console.error('Usage: node scripts/live-checks/journeys.mjs https://your-site.example [--cookie role="name=value; ..."]'); process.exit(2); }
const cookies = {};
for (let i = 0; i < args.length; i++) if (args[i] === '--cookie' && args[i + 1]) { const m = /^(\w+)=([\s\S]+)$/.exec(args[i + 1]); if (m && ROLES.includes(m[1])) cookies[m[1]] = m[2]; else { console.error(`--cookie needs a role (${ROLES.join(', ')}) then = then the cookie string`); process.exit(2); } }
const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'web', 'app');
const pages = collectPages(appRoot);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const counts = { PASS: 0, REVIEW: 0, FAIL: 0 }; const flagged = [];

async function visit(p, who, headers) {
  let status = 0, body = '';
  try { const res = await fetch(base + p.path, { redirect: 'manual', headers }); status = res.status; body = status === 200 ? (await res.text()).slice(0, 20000) : ''; } catch { /* status 0 */ }
  const j = judgePage({ kind: p.kind, status, body, who, dynamic: p.dynamic });
  counts[j.v]++; if (j.v !== 'PASS') flagged.push(`${j.v}  [${who}] ${p.path}  (${p.kind} page)  ${j.why}`);
  await sleep(Number(process.env.LIVE_CHECK_DELAY_MS ?? 120));
}
console.log(`Checking ${pages.length} pages on ${base}`);
for (const p of pages) await visit(p, 'none', {});
for (const p of pages.filter((x) => x.kind !== 'public')) await visit(p, 'forged', FORGED_HEADERS);
const given = Object.keys(cookies);
for (const role of given) for (const p of pagesFor(role, pages)) await visit(p, role, { cookie: cookies[role] });
console.log(given.length ? `Signed-in round ran for: ${given.join(', ')}. Missing account types were not checked: ${ROLES.filter((r) => !given.includes(r)).join(', ') || 'none'}.` : 'Signed-in round skipped: no --cookie given.');
console.log('\n' + (flagged.length ? flagged.join('\n') : 'Nothing flagged.'));
console.log(`\nPASS ${counts.PASS}   REVIEW ${counts.REVIEW}   FAIL ${counts.FAIL}`);
console.log('REVIEW = look at it: a page that may show content to the wrong visitor, or a broken link. FAIL = a server error, no answer, or an admin page shown to the wrong visitor.');
process.exit(counts.FAIL ? 1 : 0);
