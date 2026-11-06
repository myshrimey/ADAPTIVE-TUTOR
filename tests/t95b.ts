// t95b: renders the deployment check page with fake data (no browser, no database).
// Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t95b.ts
import { renderToStaticMarkup } from 'react-dom/server';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(globalThis as any).React = require('react');
const SECRET = 'TOP-SECRET-KEY-9999'; process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET; process.env.ADMIN_EMAILS = 'founder@x.in'; delete process.env.INVITE_SECRET; delete process.env.NEXT_PUBLIC_SUPABASE_URL;
let missing: string[] = []; let changelog: string | null = 'v106'; const audits: any[] = [];
const fake: any = { from: (t: string) => ({
  select: (c: string) => ({ limit: async () => ({ error: missing.includes(t) ? { code: '42P01', message: 'does not exist' } : null }), order: () => ({ limit: async () => ({ data: changelog ? [{ version: changelog }] : [] }) }) }),
  insert: async (r: any) => { audits.push(r); return { error: null }; } }) };
const Module = require('module'); const orig = Module._load;
Module._load = function (req: string, ...rest: any[]) {
  if (req === '@/lib/admin-page') return { adminPageGate: async () => ({ email: 'founder@x.com', superAdmin: true }), AdminNav: () => null };
  if (req === '@/lib/supabase-server') return { createServiceClient: () => fake };
  return orig.call(this, req, ...rest);
};
const render = async () => renderToStaticMarkup(await require('../apps/web/app/admin/deploy-check/page').default());
(async () => {
  const a = await render();
  ok(a.includes('Deployment check') && a.includes('<strong>v107</strong>') && a.includes('Every change this page can see is applied'), 'healthy database: version and all-applied shown');
  ok(!a.includes('behind this website') && !a.includes('NOT applied'), 'no false alarm when the database is at v106 and the website at v107');
  ok(a.includes('<code>SUPABASE_SERVICE_ROLE_KEY</code>') && a.includes('present') && a.includes('MISSING') && a.includes('not set (optional)'), 'settings shown as present, missing or optional');
  ok(!a.includes(SECRET) && !a.includes('founder@x.in'), 'no secret value or admin email appears in the page');
  ok(a.includes('guard_user_role') && a.includes('trg_audit_logs') && a.includes('tables_without_rls'), 'the three read-only SQL checks are shown');
  ok(a.includes('Leaked-password') || a.includes('leaked-password'), 'reminds about the leaked-password switch');
  missing = ['control_prompts', 'audit_logs']; changelog = 'v89';
  const b = await render();
  ok(b.includes('2 change(s) are missing') && (b.match(/NOT applied: run npm run db:migrate/g) ?? []).length === 2, 'missing migrations are flagged');
  ok(b.includes('The database is behind this website'), 'database behind the website is flagged');
  changelog = null;
  ok((await render()).includes('not available'), 'unreadable changelog shown as not available');
  ok(audits.filter((r) => r.action === 'deploy_check.view').length === 3, 'every open is audited');
  console.log(`t95b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
