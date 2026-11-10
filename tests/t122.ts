// t122: two too-open database write rules are closed (migration 0063) and the code no longer relies on them (v122).
import { readFileSync, readdirSync } from 'fs';
import { DEPLOY_PROBES, MANUAL_CHECKS, DB_VERSION_EXPECTED } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const mig = R('packages/db/migrations/0063_close_open_write_rules.sql');
const code = mig.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

// --- the migration
ok(/drop policy if exists diagnostic_questions_update_explanation on diagnostic_questions;/.test(code) && /drop policy if exists questions_update_explanation on questions;/.test(code), 'both open question-edit rules are dropped');
ok(!/create policy (questions|diagnostic_questions)_update/.test(code) && !/create policy[^;]*on (questions|diagnostic_questions)/.test(code), 'nothing re-opens editing of questions');
const pol = code.slice(code.indexOf('create policy pilot_payments_insert_own'), code.indexOf('insert into system_changelog'));
ok(/for insert/.test(pol) && /to authenticated/.test(pol) && /u\.auth_user_id = auth\.uid\(\)/.test(pol), 'payment insert rule is still limited to the student\'s own record');
for (const c of ["status = 'pending'", 'confirmed_at is null', 'pilot_start_date is null', 'pilot_end_date is null', 'admin_notes is null', 'activated_at is null', 'activated_by is null', 'product_code is null', 'list_amount is null', 'offer_code is null', 'subject_slugs is null', 'paid_by_user_id is null', 'quantity = 1', 'discount_amount = 0']) ok(pol.includes(c), `payment insert rule requires: ${c}`);
ok(/drop policy if exists pilot_payments_insert_own/.test(code), 're-runnable (drops its own rule first)');
ok(!/\b(drop|alter|truncate)\s+table\b|delete\s+from|drop\s+column/i.test(code), 'no table, column or row is removed');
ok(/system_changelog/.test(code) && /'v122'/.test(code) && /where not exists/.test(code), 'writes its changelog row once');
// no later (or other) migration puts a loose update rule back on the question tables
const files = readdirSync('packages/db/migrations').filter((x) => x.endsWith('.sql')).sort();
const reopen = files.filter((x) => +x.slice(0, 4) > 8 && /create policy\s+\w+\s+on\s+(questions|diagnostic_questions)\s+for\s+(update|all|insert|delete)/i.test(R('packages/db/migrations/' + x)));
ok(reopen.length === 0, 'no migration after 0008 adds an edit rule on the question tables: ' + reopen.join());
ok(files[files.length - 1] === '0063_close_open_write_rules.sql', '0063 is the newest migration');

// --- the code
const ee = R('packages/core/explanations/ensure-explanation.ts');
ok(/getServiceClient\(\)/.test(ee) && /writer\.from\(table\)\.update\(\{ explanation: text \}\)/.test(ee) && /\.is\('explanation', null\)/.test(ee), 'a generated explanation is saved with the server key, and never over an existing one');
ok(!/supabase\.from\(table\)\.update/.test(ee), 'no save through the signed-in account any more');
// every write to a question table anywhere uses the server-side client
const bad: string[] = [];
const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) { const s = R(p); for (const m of s.matchAll(/\b(\w+)\.from\(('(?:questions|diagnostic_questions)'|table)\)\s*\.(update|insert|upsert|delete)/g)) if (!['service', 'writer', 'admin'].includes(m[1])) bad.push(`${p}: ${m[1]}`); } } };
walk('packages/core'); walk('apps/web');
ok(bad.length === 0, 'every write to the question tables uses the server-side client: ' + bad.join('; '));
// the payment form's own insert only sends what the new rule accepts
const pp = R('packages/core/pilot/pilot-payment.service.ts');
const ins = pp.slice(pp.indexOf("from('pilot_payments').insert({"), pp.indexOf('if (error) throw error;'));
const keys = [...ins.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]).sort().join();
ok(keys === ['amount', 'offer_label', 'payment_date', 'status', 'student_id', 'transaction_reference'].sort().join() && /status: 'pending'/.test(ins), 'the payment form only sends fields the stricter rule accepts: ' + keys);

// --- deploy check and notes
ok(DB_VERSION_EXPECTED === 'v122', 'deploy check expects database version v122');
const mc = MANUAL_CHECKS.find((c) => c.migration === '0063');
ok(!!mc && /pg_policies/.test(mc!.sql) && /pilot_payments_insert_own/.test(mc!.expect), 'a read-only manual check shows the three tables\' write rules');
ok(!DEPLOY_PROBES.some((p) => p.migration === '0063'), 'no table probe (this change adds no table)');
const rb = R('docs/ROLLBACK_NOTES.md');
ok(rb.indexOf('## 0063 ') > -1 && rb.indexOf('## 0063 ') < rb.indexOf('## 0062 ') && /re-opens the hole/.test(rb), 'undo note exists, newest first, and warns what undoing re-opens');
ok(/## 0063 close_open_write_rules/.test(R('docs/DATABASE_SCHEMA.md')), 'schema doc describes 0063');
console.log(`t122: ${n - f}/${n} passed`); if (f) process.exit(1);
