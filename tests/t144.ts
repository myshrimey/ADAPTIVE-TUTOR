// t144: the account list shows the TEST label (v144). Label only; the directory query and filters are unchanged.
import { readFileSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const page = R('apps/web/app/admin/accounts/page.tsx');
ok(/listTestAccountIds\(service\)/.test(page) && /testIds\.has\(r\.id\) \? ' · TEST'/.test(page), 'the list reads the marks and shows TEST next to the account');
ok(page.indexOf('adminPageGate') < page.indexOf('listTestAccountIds(service)'), 'the Super Admin gate comes before the marks are read');
ok(!/test_accounts/.test(R('packages/core/accounts/store.ts')) && !/test_accounts|testAccount|isTest/i.test(R('packages/core/accounts/logic.ts')), 'the directory query and filters do not depend on the mark');
console.log(`t144: ${n - f}/${n} passed`); if (f) process.exit(1);
