import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync('' + p, 'utf8');
const acc = R('apps/web/app/api/invite/accept/route.ts');
ok(!/body\.role|b\.role|\.role\s*=\s*b\./.test(acc), 'accept route never reads a role from the request');
ok(/role: inv\.role/.test(acc) && /claimInvitation/.test(acc) && /findExistingAccount/.test(acc), 'role comes from invitation; single-use claim; existing account check');
ok(!/password/.test(R('packages/core/invitations/store.ts').replace(/password/g, 'password')) || !/insert\([^)]*password/.test(R('packages/core/invitations/store.ts')), 'password never stored on invitations');
for (const p of ['apps/web/app/api/admin/invitations/route.ts']) ok((R(p).match(/requireAdmin\('invitations'\)/g) ?? []).length === 3, p + ' every method gated');
const team = R('apps/web/app/api/admin/team/route.ts'); ok((team.match(/requireAdmin\(\)/g) ?? []).length === 3, 'team API: super admin only on all 3 methods');
ok(/requireAdmin\(\)/.test(R('apps/web/app/api/admin/role-changes/route.ts')), 'role-change decision is super admin only');
const cen = R('apps/web/app/api/centre/invitations/route.ts'); ok(/getPortalUser/.test(cen) && /role === 'centre'/.test(cen) && !/body\.org|body\.orgUser/.test(cen) && /CENTRE_ROLES/.test(cen), 'centre API: session-derived centre, restricted roles');
ok(/orgUser: me\.userId/.test(cen), 'centre id from session only');
const mig = R('packages/db/migrations/0049_invitations_team.sql');
for (const t of ['invitations', 'invitation_events', 'admin_team', 'org_members', 'role_changes']) ok(new RegExp(`alter table ${t} enable row level security`).test(mig), 'RLS on ' + t);
ok(!/create policy/.test(mig), 'no policies: server-only tables');
ok(/trg_guard_user_role/.test(mig) && /auth\.uid\(\) is not null/.test(mig), 'role self-change guard');
ok(/token_hash text not null unique/.test(mig) && !/\btoken text\b/.test(mig), 'token hash unique; no raw token column');
// every admin page file gates
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = d + '/' + x; return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const p of ['users/page.tsx', 'users/create/page.tsx', 'invitations/page.tsx', 'invitations/[id]/page.tsx', 'team/page.tsx']) ok(/adminPageGate\(/.test(R('apps/web/app/admin/' + p)), 'page gated: ' + p);
ok(/adminPageGate\(\)/.test(R('apps/web/app/admin/team/page.tsx')), 'team page super admin only');
ok(/invitation|Invitation/.test(R('apps/web/lib/admin-menu.ts')) && /admin\/team/.test(R('apps/web/lib/admin-menu.ts')), 'in admin menu');
// no XSS sink in new files
const files = [...walk('apps/web/components/invite'), ...walk('apps/web/app/invite'), 'apps/web/components/HelpCenter.tsx'];
ok(files.every((p) => !/dangerouslySetInnerHTML|innerHTML/.test(readFileSync(p, 'utf8'))), 'no raw HTML injection in new UI');
ok(!/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(files.map((p) => readFileSync(p, 'utf8')).join('')), 'no secrets in client files');
// previously guarded routes keep their gates
ok(/requireAdmin\('marketing'\)/.test(R('apps/web/app/api/admin/acquisition/route.ts')) && /requireAdmin\('academic'\)/.test(R('apps/web/app/api/admin/teachers/route.ts')) && /requireAdmin\(\)/.test(R('apps/web/app/api/admin/students/route.ts')), 'students API still super admin only');
console.log(`t79b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
