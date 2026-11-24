// t140: View Account As Admin (v140): signed short-lived ticket, read-only by construction, reason + audit + rate limit, masked, students only.
import { readFileSync, readdirSync, statSync } from 'fs';
import { signTicket, verifyTicket, cleanReason, TICKET_TTL_MS, MAX_STARTS_PER_HOUR, VIEW_GROUPS, isViewGroup, overLimit, startsInLastHour, resolveViewTarget } from '../packages/core/view-as';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const walk = (d: string): string[] => readdirSync(d).flatMap((e) => { const p = d + '/' + e; return statSync(p).isDirectory() ? walk(p) : [p]; });
const SECRET = 'x'.repeat(40), NOW = new Date('2026-11-22T10:00:00Z'), TGT = '11111111-1111-1111-1111-111111111111';
(async () => {
  const t = signTicket('Admin@X.com', TGT, SECRET, NOW);
  const ok1 = verifyTicket(t, SECRET, 'admin@x.com', new Date(NOW.getTime() + 60000));
  ok(ok1.ok && ok1.payload.tgt === TGT && ok1.minutesLeft === 14, 'a fresh ticket verifies for the admin it was issued to (email case ignored)');
  ok(TICKET_TTL_MS === 15 * 60000 && !verifyTicket(t, SECRET, 'admin@x.com', new Date(NOW.getTime() + TICKET_TTL_MS)).ok && (verifyTicket(t, SECRET, 'admin@x.com', new Date(NOW.getTime() + TICKET_TTL_MS)) as any).reason === 'expired', 'expires at 15 minutes, no refresh');
  ok((verifyTicket(t, SECRET, 'other@x.com', NOW) as any).reason === 'wrong_admin', 'another admin cannot use the ticket');
  ok((verifyTicket(t, 'y'.repeat(40), 'admin@x.com', NOW) as any).reason === 'invalid', 'wrong secret is refused');
  const [b, s] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, 'base64url').toString()), tgt: '22222222-2222-2222-2222-222222222222' })).toString('base64url') + '.' + s;
  ok((verifyTicket(forged, SECRET, 'admin@x.com', NOW) as any).reason === 'invalid', 'changing the target breaks the signature');
  const longer = JSON.parse(Buffer.from(b, 'base64url').toString()); longer.exp += 3600000;
  ok(!verifyTicket(Buffer.from(JSON.stringify(longer)).toString('base64url') + '.' + s, SECRET, 'admin@x.com', NOW).ok, 'extending the expiry breaks the signature');
  ok(!verifyTicket('', SECRET, 'a', NOW).ok && !verifyTicket('a.b.c', SECRET, 'a', NOW).ok && !verifyTicket(undefined, SECRET, 'a', NOW).ok, 'garbage is refused');
  let threw = false; try { signTicket('a', TGT, 'short'); } catch { threw = true; } ok(threw, 'no ticket without a real secret');
  ok(signTicket('a@x.com', TGT, SECRET, NOW) !== signTicket('a@x.com', TGT, SECRET, NOW), 'every ticket is unique');
  ok(!cleanReason('short').ok && !cleanReason('x'.repeat(201)).ok && (cleanReason('  Parent reported   a stuck lesson ') as any).value === 'Parent reported a stuck lesson', 'a plain reason of 8 to 200 characters is required');
  ok(VIEW_GROUPS.join() === 'dashboard,progress,report' && isViewGroup('report') && !isViewGroup('profile') && !isViewGroup('messages'), 'a short fixed list of pages (no messages, no contact details)');
  ok(MAX_STARTS_PER_HOUR === 20 && overLimit(20) && !overLimit(19), 'limit is 20 a hour');
  const cnt: any = { from: () => { const q: any = { select: () => q, eq: () => q, gte: () => Promise.resolve({ count: 7 }) }; return q; } };
  ok((await startsInLastHour(cnt, 'a@x.com', NOW)) === 7, 'counts recent starts from the Audit log');
  const noStudent: any = { from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ data: null }) }; return q; } };
  ok((await resolveViewTarget(noStudent, TGT)) === null, 'only accounts with a student record can be viewed');

  // read-only by construction
  const viewFiles = walk('apps/web/app/admin/view-as/[ticket]').concat(['packages/core/view-as/store.ts']);
  ok(viewFiles.length >= 2, 'found the view files');
  for (const file of viewFiles) { const c = R(file).replace(/\/\/.*$/gm, ''); ok(!/\.(insert|update|delete|upsert|rpc)\(/.test(c) && !/method=["']post|fetch\(|use client|use server|<form|<input|<button|dangerouslySetInnerHTML/i.test(c), `${file}: no write path, form, fetch or client code`); }
  ok(/writeAudit/.test(R('apps/web/app/admin/view-as/[ticket]/[group]/page.tsx')), 'the only write in the page folder is the Audit line (checked separately)');
  const page = R('apps/web/app/admin/view-as/[ticket]/[group]/page.tsx');
  ok(page.indexOf('adminPageGate()') < page.indexOf('verifyTicket(') && page.indexOf('verifyTicket(') < page.indexOf('loadViewData('), 'order: admin gate, then ticket check, then data');
  ok(/dynamic = 'force-dynamic'/.test(page) && /account\.view_as_page/.test(page) && /Read only/.test(page) && /view-as\/end\?t=/.test(page), 'no-store page, each page opened is audited, banner with Exit');
  ok(!/display_name|email|phone|whatsapp|studentName|student_name|message/.test(R('packages/core/view-as/store.ts').replace(/adminEmail|actor_email|\(data as any\)\.display_name|select\('id, display_name, grade'\)/g, '')), 'view data carries no name, email, phone or message fields');
  ok(/studentName/.test(R('packages/core/reports/parent-report.service.ts')) && !/studentName/.test(R('packages/core/view-as/store.ts')), 'the report builder returns a name; the view layer drops it');
  // start + end
  const api = R('apps/web/app/api/admin/view-as/route.ts');
  ok(/requireAdmin\(\)/.test(api) && !/requireAdmin\(['"]/.test(api), 'start is Super Admin only');
  ok(/cleanReason/.test(api) && /overLimit/.test(api) && /account\.view_as_start/.test(api) && /reason: reason\.value/.test(api), 'start needs a reason, checks the limit, records it with the reason');
  ok(api.indexOf('cleanReason') < api.indexOf('signTicket(') && api.indexOf('resolveViewTarget') < api.indexOf('signTicket('), 'no ticket before reason, limit and student checks');
  const end = R('apps/web/app/admin/view-as/end/route.ts');
  ok(/account\.view_as_end/.test(end) && /requireAdmin\(\)/.test(end) && /new Date\(0\)/.test(end), 'exit is recorded and always works');
  ok(/ViewAsStart/.test(R('apps/web/app/admin/accounts/[id]/page.tsx')) && /Reason/.test(R('apps/web/app/admin/accounts/[id]/ViewAsStart.tsx')), 'start button lives on the account page with a reason box');
  ok(/viewAsSecret/.test(R('apps/web/lib/view-as.ts')) && /SUPABASE_SERVICE_ROLE_KEY/.test(R('apps/web/lib/view-as.ts')) && !/NEXT_PUBLIC/.test(R('apps/web/lib/view-as.ts')), 'secret is derived from the server key and never public');
  // control 4: no student write route takes the student from the request
  const apiFiles = walk('apps/web/app/api').filter((x) => x.endsWith('route.ts') && !x.includes('/admin/') && !x.includes('/portal/'));
  const bad = apiFiles.filter((x) => /(body|b|json|input)\??\.(studentId|student_id)|get\('(studentId|student_id)'\)/.test(R(x)));
  ok(bad.length === 0, 'student routes always use the signed-in session, never an id from the request: ' + bad.join());
  console.log(`t140: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
