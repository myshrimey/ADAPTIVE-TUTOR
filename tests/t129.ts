// t129: profile details and school history are saved only with the server key; migration 0065 leaves read-only rules (v129).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const route = R('apps/web/app/api/profile/route.ts');
ok(/upsertStudentProfileDetails\(createServiceClient\(\),\s*studentId/.test(route), 'details saved with the server key');
ok(/upsertAcademicHistory\(createServiceClient\(\),\s*studentId/.test(route), 'history saved with the server key');
ok(/getCurrentStudentId\(\)/.test(route) && route.indexOf('getCurrentStudentId()') < route.indexOf('upsertStudentProfileDetails('), 'student id comes from the session before any save');
ok(/cleanProfileInput/.test(route), 'input is cleaned first');
// only /api/profile may call the two writers
const callers: string[] = [];
const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name) && /upsert(StudentProfileDetails|AcademicHistory)\(/.test(R(p)) && !p.endsWith('student-profile.service.ts')) callers.push(p); } };
walk('apps/web'); walk('packages/core');
ok(callers.length === 1 && callers[0].endsWith('api/profile/route.ts'), 'only /api/profile calls the writers: ' + callers.join());
// no other direct write to the two tables
const direct: string[] = [];
const walk2 = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk2(p); else if (/\.(ts|tsx)$/.test(e.name) && !p.endsWith('student-profile.service.ts')) { if (/\.from\('(student_profile_details|student_academic_history)'\)[\s\S]{0,300}?\.(insert|update|upsert|delete)\(/.test(R(p))) direct.push(p); } } };
walk2('apps/web'); walk2('packages/core');
ok(direct.length === 0, 'no other write to the two tables: ' + direct.join());
const mig = R('packages/db/migrations/0065_profile_tables_read_only.sql');
const code = mig.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
ok(/drop policy if exists student_profile_details_owner/.test(code) && /drop policy if exists student_academic_history_owner/.test(code), 'old broad rules dropped');
ok((code.match(/create policy/g) || []).length === 2 && (code.match(/for select to authenticated/g) || []).length === 2, 'two read-only rules created');
ok(!/for (all|insert|update|delete)/i.test(code), 'no write rule created');
ok(/drop policy if exists \w+_select_own on/.test(code), 'select rules re-runnable');
ok(!/\b(drop|alter|truncate)\s+table\b|delete\s+from|drop\s+column/i.test(code), 'no table, column or row removed');
ok(/'v129'/.test(code) && /where not exists/.test(code), 'changelog once');
const files = readdirSync('packages/db/migrations').filter((x) => x.endsWith('.sql')).sort();
ok(files.includes('0065_profile_tables_read_only.sql'), '0065 present');
console.log(`t129: ${n - f}/${n} passed`); if (f) process.exit(1);
