// t103: request limit on the free public readiness check (v103).
import { readFileSync, readdirSync } from 'fs';
import { decidePublicCheck, PUBLIC_CHECK_MAX_PER_IP, PUBLIC_CHECK_WINDOW_MINUTES, PUBLIC_CHECK_BLOCKED_TEXT } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

// ---- pure rules
ok(decidePublicCheck(0).allowed && decidePublicCheck(PUBLIC_CHECK_MAX_PER_IP - 1).allowed, 'just under the limit is allowed');
const d: any = decidePublicCheck(PUBLIC_CHECK_MAX_PER_IP);
ok(!d.allowed && d.reason === 'too_many_requests' && d.retryAfterSeconds === PUBLIC_CHECK_WINDOW_MINUTES * 60, 'at the limit it waits, and says for how long');
ok(decidePublicCheck(NaN).allowed && decidePublicCheck(undefined as any).allowed, 'bad numbers never block anyone');
ok(PUBLIC_CHECK_MAX_PER_IP >= 60, 'a school or family sharing one address can still use it');
ok(!/lock|ban|suspend|blame|attack|hack|bot/i.test(PUBLIC_CHECK_BLOCKED_TEXT) && /10 minutes/.test(PUBLIC_CHECK_BLOCKED_TEXT), 'neutral wording, states the wait');

// ---- helper behaviour with a fake database
(async () => {
  const { checkPublicCheckAllowed, checkIpHash } = require('../apps/web/lib/public-check-limit');
  const rows: any[] = [];
  const mk = (boom = false, errored = false): any => ({ from: (t: string) => {
    if (t !== 'public_check_log') throw new Error('wrong table ' + t);
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
  let allowedCount = 0;
  for (let i = 0; i < PUBLIC_CHECK_MAX_PER_IP; i++) if ((await checkPublicCheckAllowed(db, req('1.1.1.1'))).allowed) allowedCount++;
  ok(allowedCount === PUBLIC_CHECK_MAX_PER_IP, 'the first N requests are allowed');
  ok(!(await checkPublicCheckAllowed(db, req('1.1.1.1'))).allowed, 'the next one waits');
  ok(rows.length === PUBLIC_CHECK_MAX_PER_IP, 'a blocked request adds no row (the table cannot be flooded by blocked calls)');
  ok((await checkPublicCheckAllowed(db, req('2.2.2.2'))).allowed, 'another address is not affected');
  const s = JSON.stringify(rows);
  ok(!s.includes('1.1.1.1') && !s.includes('2.2.2.2') && /^[0-9a-f]{64}$/.test(rows[0].ip_hash) && Object.keys(rows[0]).sort().join() === 'created_at,ip_hash', 'only a one-way hash and a time are stored');
  ok(checkIpHash(req('1.1.1.1')) !== checkIpHash(req('2.2.2.2')) && checkIpHash(req('1.1.1.1')) === checkIpHash(req('1.1.1.1, 9.9.9.9')), 'same address same hash; first forwarded address is used');
  ok((await checkPublicCheckAllowed(mk(true), req('3.3.3.3'))).allowed, 'a database that is down never blocks anyone');
  ok((await checkPublicCheckAllowed(mk(false, true), req('3.3.3.3'))).allowed, 'a database error (e.g. table missing before 0060) never blocks anyone');

  // ---- wiring
  const route = R('apps/web/app/api/public/check/route.ts');
  ok((route.match(/checkPublicCheckAllowed\(/g) ?? []).length === 2, 'both GET and POST are limited');
  const gi = route.indexOf('export async function GET'), pi = route.indexOf('export async function POST');
  ok(route.indexOf('checkPublicCheckAllowed(', gi) < route.indexOf("from('subjects')") && route.indexOf('checkPublicCheckAllowed(', pi) < route.indexOf("from('diagnostic_questions')", pi), 'the limit is checked BEFORE any question-bank read');
  ok(/status:\s*429/.test(route) && /Retry-After/.test(route), 'blocked answer is HTTP 429 with Retry-After');
  const page = R('apps/web/app/check/page.tsx');
  ok((page.match(/res\.status === 429/g) ?? []).length === 2 && page.includes('PUBLIC_CHECK_BLOCKED_TEXT'), 'the page shows the friendly wait message for both calls');

  // ---- migration
  const mig = R('packages/db/migrations/0060_public_check_limit.sql');
  const code = mig.replace(/--.*$/gm, '');
  ok(/create table if not exists public\.public_check_log/.test(code) && /enable row level security/.test(code) && !/create policy/i.test(code), 'server-only table: RLS on, no policy');
  ok(/ip_hash text not null/.test(code) && !/email|name|answer|user_id|student/i.test(code.split('system_changelog')[0]), 'holds only an address hash and a time');
  ok(!/\b(drop|delete|truncate|alter\s+table\s+\S+\s+drop)\b/i.test(code), 'additive only');
  ok(/where not exists/.test(code), 'changelog line is re-runnable');
  ok(readdirSync('packages/db/migrations').filter((x) => x.startsWith('0060_')).length === 1, 'one 0060 file');

  // ---- bookkeeping
  ok(/## 0060 public_check_limit \(v103\)/.test(R('docs/DATABASE_SCHEMA.md')), 'schema doc has 0060');
  ok(/## 0060 public_check_limit/.test(R('docs/ROLLBACK_NOTES.md')) && /drop table if exists public\.public_check_log;/.test(R('docs/ROLLBACK_NOTES.md')), 'rollback notes have the 0060 undo');
  ok(/public_check_log/.test(R('packages/core/deploy-check/index.ts')), 'deploy-check probes 0060');
  ok(/public\/check/.test(R('tests/t97.ts')), 'route is still on the t97 public list');
  console.log(`t103: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
