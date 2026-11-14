// t128: a student can no longer edit their own `students` row directly (migration 0064), and the website never needed that rule (v128).
import { readFileSync, readdirSync } from 'fs';
import { DEPLOY_PROBES, MANUAL_CHECKS, DB_VERSION_EXPECTED } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const mig = R('packages/db/migrations/0064_close_student_self_edit.sql');
const code = mig.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
ok(/drop policy if exists students_update_own on students;/.test(code), 'the self-edit rule is dropped (re-runnable)');
ok(!/create policy/i.test(code), 'no rule is created again');
ok(!/\b(drop|alter|truncate)\s+table\b|delete\s+from|drop\s+column/i.test(code), 'no table, column or row is removed');
ok(/'v128'/.test(code) && /where not exists/.test(code), 'writes its changelog row once');
const files = readdirSync('packages/db/migrations').filter((x) => x.endsWith('.sql')).sort();
ok(files.includes('0064_close_student_self_edit.sql'), '0064 is present');
const reopen = files.filter((x) => +x.slice(0, 4) > 2 && /create policy\s+\w+\s+on\s+students\s+for\s+(update|all|insert|delete)/i.test(R('packages/db/migrations/' + x)));
ok(reopen.length === 0, 'no later migration puts an edit rule back on students: ' + reopen.join());

// --- the website never writes `students` with the signed-in client
const SERVICE = /service|admin|svc|writer/i;
export function userWrites(src: string): string[] {
  const svcVars = new Set([...src.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:createServiceClient|getServiceClient)\(/g)].map((m) => m[1]));
  const out: string[] = [];
  for (const m of src.matchAll(/([\w.()]+?)\s*\.from\('students'\)/g)) {
    const chain = src.slice(m.index! + m[0].length, m.index! + m[0].length + 400).split(/;|\n\s*\n/)[0];
    if (!/\.(insert|update|upsert|delete)\(/.test(chain)) continue;
    const recv = m[1]; const last = recv.split('.').pop()!;
    if (svcVars.has(last) || SERVICE.test(recv) || /createServiceClient|getServiceClient/.test(recv)) continue;
    out.push(recv);
  }
  return out;
}
const bad: string[] = []; let writes = 0;
const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) { const s = R(p); bad.push(...userWrites(s).map((r) => p + ' via ' + r)); writes += [...s.matchAll(/\.from\('students'\)[\s\S]{0,400}?\.(insert|update|upsert|delete)\(/g)].length; } } };
walk('packages/core'); walk('apps/web'); walk('scripts');
ok(bad.length === 0, 'no write to students uses the signed-in client: ' + bad.join('; '));
ok(writes >= 5, `the scan really sees the server-key writes to students (${writes})`);
// the scan itself catches a signed-in write (mutation check)
ok(userWrites("const { error } = await supabase.from('students').update({ grade: 9 }).eq('id', id);").length === 1, 'scan flags a signed-in update');
ok(userWrites("const service = createServiceClient();\nawait service.from('students').update({ grade: 9 }).eq('id', id);").length === 0, 'scan accepts a server-key update');
ok(userWrites("const { data } = await supabase.from('students').select('id').eq('user_id', u);").length === 0, 'scan ignores reads');

// --- deploy check and notes
ok(['v128','v129'].includes(DB_VERSION_EXPECTED), 'deploy check expects database version v128');
const mc = MANUAL_CHECKS.find((c) => c.migration === '0064');
ok(!!mc && /pg_policies/.test(mc!.sql) && /students_select_own/.test(mc!.expect), 'a read-only manual check shows the one rule left on students');
ok(!DEPLOY_PROBES.some((p) => p.migration === '0064'), 'no table probe (no new table)');
const rb = R('docs/ROLLBACK_NOTES.md');
ok(rb.indexOf('## 0064 ') > -1 && rb.indexOf('## 0064 ') < rb.indexOf('## 0063 ') && /re-opens the hole/.test(rb), 'undo note exists, newest first, and warns what undoing re-opens');
ok(/## 0064 close_student_self_edit/.test(R('docs/DATABASE_SCHEMA.md')), 'schema doc describes 0064');
const plan = R('docs/OWNER_WRITE_RULES_PLAN.md');
ok(/mastery_states/.test(plan) && /supervised/.test(plan) && /NOT done/.test(plan), 'the plan for the remaining student-owned rules exists and says it is not done');
console.log(`t128: ${n - f}/${n} passed`); if (f) process.exit(1);
