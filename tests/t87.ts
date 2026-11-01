import { readFileSync, readdirSync, statSync } from 'fs';
import { PAGE_PERMISSION, permissionForPath, visiblePath, can, pagesOpenedBy, PERMISSIONS } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = d + '/' + x; return statSync(p).isDirectory() ? walk(p) : [p]; });
const root = 'apps/web/app';
const pages = walk(root + '/admin').filter((p) => p.endsWith('/page.tsx'));
// 1. every admin page: the permission the menu promises == the permission its gate really asks for
let mism: string[] = [];
for (const file of pages) {
  const path = '/' + file.slice(root.length + 1).replace(/\/page\.tsx$/, '');
  const promised = permissionForPath(path);
  if (path === '/admin' || path === '/admin/students' || path === '/admin/payments') continue; // gated by ADMIN_EMAILS inside the page (Super Admin only)
  const m = readFileSync(file, 'utf8').match(/adminPageGate\(([^)]*)\)/);
  const real = m ? m[1].replace(/['"\s]/g, '') || undefined : 'NO_GATE';
  if ((promised ?? undefined) !== real) mism.push(`${path}: menu says ${promised ?? 'Super Admin'}, gate says ${real ?? 'Super Admin'}`);
}
ok(mism.length === 0, 'menu and gates agree: ' + mism.join(' | '));
// 2. behaviour
const fin = { superAdmin: false, member: { status: 'active', permissions: ['finance', 'technology', 'content'] } };
for (const p of ['/admin/pricing', '/admin/payments', '/admin/expenses', '/admin/ai-economics', '/admin/ai-infrastructure', '/admin/questions', '/admin/reviews', '/admin/question-bank', '/admin/referral-rewards']) ok(!visiblePath(p, fin) && !can(fin, permissionForPath(p)), 'finance/technology/content member does NOT see ' + p);
const mk = { superAdmin: false, member: { status: 'active', permissions: ['marketing'] } };
ok(visiblePath('/admin/acquisition', mk) && visiblePath('/admin/social-growth', mk) && !visiblePath('/admin/users', mk) && !visiblePath('/admin/pricing', mk), 'marketing member sees exactly marketing pages');
ok(visiblePath('/admin/pricing', { superAdmin: true }) && visiblePath('/admin/ai-economics', { superAdmin: true }), 'Super Admin sees everything');
ok(!visiblePath('/admin/acquisition', { superAdmin: false, member: { status: 'suspended', permissions: ['marketing'] } }), 'suspended member sees nothing');
ok(!visiblePath('/admin/team', { superAdmin: false, member: { status: 'active', permissions: [...PERMISSIONS] } }) && !visiblePath('/admin/audit-log', { superAdmin: false, member: { status: 'active', permissions: [...PERMISSIONS] } }), 'even with every permission: team, audit log stay Super Admin only');
ok(pagesOpenedBy('finance') === 0 && pagesOpenedBy('technology') === 0 && pagesOpenedBy('content') === 0 && pagesOpenedBy('marketing') === 2 && pagesOpenedBy('academic') === 3, 'honest page counts per permission');
ok(/does not open any admin page yet/.test(readFileSync('apps/web/components/invite/TeamManager.tsx', 'utf8')), 'team screen says so');
// 3. every API route that takes a permission asks for one that exists
const apis = walk(root + '/api').filter((p) => p.endsWith('route.ts'));
let badPerm: string[] = [];
for (const file of apis) for (const m of readFileSync(file, 'utf8').matchAll(/requireAdmin\('([a-z_]+)'\)/g)) if (!(PERMISSIONS as readonly string[]).includes(m[1])) badPerm.push(file + ':' + m[1]);
ok(badPerm.length === 0, 'API permission names are real: ' + badPerm.join());
console.log(`t87: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
