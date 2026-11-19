// t130: learning profile, subject goals and session check-ins are written only with the server key; migration 0066 leaves read-only rules (v130).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const A = (p: string) => R('apps/web/app/api/' + p + '/route.ts');
ok(/registerSubject\(createServiceClient\(\),\s*studentId/.test(A('baseline/start')), 'baseline start registers with the server key');
ok(/registerSubject\(createServiceClient\(\),\s*studentId/.test(A('diagnostic/start')), 'diagnostic start registers with the server key');
ok(/registerSubject\(createServiceClient\(\),\s*studentId/.test(A('student/subjects')), 'subject picker registers with the server key');
ok(/registerSubject\(service,\s*studentId/.test(A('student/onboarding')), 'onboarding registers with the server key');
ok(/recordCheckin\(createServiceClient\(\),\s*studentId/.test(A('session/start')), 'check-in saved with the server key');
const ca = A('session/checkin-after');
ok(/const studentId = await getCurrentStudentId\(\)/.test(ca) && /recordConfidenceAfter\(createServiceClient\(\),\s*studentId,/.test(ca), 'confidence-after uses the server key and the session student id');
const svc = R('packages/core/checkins/checkin.service.ts');
ok(/\.eq\('session_id', sessionId\)\s*\.eq\('student_id', studentId\)/.test(svc), 'confidence-after update is filtered by student id');
ok(/\.eq\('student_id', studentId\)/.test(R('packages/core/learner-model/preferences.service.ts')), 'preference writer filters by student id');
// every route that hands a client to these writers must hand the server key (scan)
const bad: string[] = [];
const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) { const s = R(p); for (const m of s.matchAll(/(registerSubject|recordCheckin|recordConfidenceAfter|savePreferenceEvidence)\(\s*([\w.()]+?)\s*,/g)) { if (!/^(createServiceClient\(\)|service|getServiceClient\(\))$/.test(m[2])) bad.push(p + ' ' + m[1] + ' with ' + m[2]); } } } };
walk('apps/web'); walk('packages/core');
ok(bad.length === 0, 'writers are always given the server key: ' + bad.join('; '));
// no other direct write to the three tables with a signed-in client
const direct: string[] = [];
const walk2 = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk2(p); else if (/\.(ts|tsx)$/.test(e.name)) { const s = R(p); for (const m of s.matchAll(/([\w.()]+?)\s*\.from\('(learning_profiles|learning_goals|session_checkins)'\)/g)) { const chain = s.slice(m.index! + m[0].length, m.index! + m[0].length + 400).split(/;|\n\s*\n/)[0]; if (/\.(insert|update|upsert|delete)\(/.test(chain) && !/service|getServiceClient|createServiceClient/.test(m[1]) && !/checkin\.service|subject\.service|preferences\.service/.test(p)) direct.push(p + ' ' + m[1]); } } } };
walk2('apps/web'); walk2('packages/core');
ok(direct.length === 0, 'no other direct write with a signed-in client: ' + direct.join('; '));
const mig = R('packages/db/migrations/0066_learning_tables_read_only.sql');
const code = mig.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
for (const t of ['learning_profiles', 'learning_goals', 'session_checkins']) {
  ok(new RegExp(`drop policy if exists ${t}_owner on ${t};`).test(code), t + ' old broad rule dropped');
  ok(new RegExp(`create policy ${t}_select_own on ${t}\\s+for select to authenticated`).test(code), t + ' read-only rule created');
}
ok(!/for (all|insert|update|delete)/i.test(code), 'no write rule created');
ok(!/\b(drop|alter|truncate)\s+table\b|delete\s+from|drop\s+column/i.test(code), 'no table, column or row removed');
ok(/'v130'/.test(code) && /where not exists/.test(code), 'changelog once');
ok(readdirSync('packages/db/migrations').includes('0066_learning_tables_read_only.sql'), '0066 present');
console.log(`t130: ${n - f}/${n} passed`); if (f) process.exit(1);
