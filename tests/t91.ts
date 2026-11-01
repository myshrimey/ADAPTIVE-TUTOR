// t91: audit trail + access-control scan (v91).
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { writeAudit, listAudit } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const walk = (d: string, out: string[] = []): string[] => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };

// ---------- 1. every admin API handler asks the server-side gate (static scan)
const GATE = /(await\s+)?(requireAdmin|getAdminUser|assertAdmin)\(|ADMIN_EMAILS|\bguard\(/;
const PUBLIC_ADMIN_ROUTES: Record<string, string> = { 'apps/web/app/api/admin/curriculum/template/route.ts': 'public static CSV template with no data (intended)' };
const apiRoutes = walk('apps/web/app/api/admin').filter((p) => /route\.ts$/.test(p));
ok(apiRoutes.length >= 40, `found the admin API routes (${apiRoutes.length})`);
for (const p of apiRoutes) { if (PUBLIC_ADMIN_ROUTES[p]) continue; ok(GATE.test(R(p)), `admin API has a server-side gate: ${p}`); }
ok(Object.keys(PUBLIC_ADMIN_ROUTES).every((p) => existsSync(p)), 'documented exception still exists (remove it from the list if the file is deleted)');
// the guard() helper used by social-growth really calls requireAdmin
ok(/function guard[\s\S]{0,300}requireAdmin\(/.test(R('apps/web/app/api/admin/social-growth/[section]/route.ts')), 'social-growth guard() calls requireAdmin');
// an admin API that checks the gate must run it BEFORE reading the body or touching the database
for (const p of apiRoutes) { if (PUBLIC_ADMIN_ROUTES[p]) continue; const s = R(p); const g = s.search(GATE); const b = Math.min(...['request.json', 'req.json', 'createServiceClient()'].map((t) => { const i = s.indexOf(t, s.indexOf('export async function')); return i < 0 ? 1e9 : i; })); if (g >= 0 && b < 1e9) { const gi = Math.min(...['requireAdmin(', 'getAdminUser(', 'assertAdmin('].map((t) => { const i = s.indexOf(t, s.indexOf('export async function')); return i < 0 ? 1e9 : i; })); if (gi < 1e9) ok(gi < b || /guard\(/.test(s), `gate comes before body/database use: ${p}`); } }

// ---------- 2. every admin page is gated
const pages = walk('apps/web/app/admin').filter((p) => /page\.tsx$/.test(p));
ok(pages.length >= 60, `found admin pages (${pages.length})`);
const PAGE_EXCEPT: Record<string, string> = { 'apps/web/app/admin/page.tsx': 'only redirects to the command centre, which is gated' };
for (const p of pages) { if (PAGE_EXCEPT[p]) continue; const s = R(p); ok(/adminPageGate\(|ADMIN_EMAILS/.test(s), `admin page has a server-side gate: ${p}`); ok(!/^['"]use client['"]/.test(s.trim()), `admin page is a server component: ${p}`); }
ok(/redirect\('\/admin\/command-centre'\)/.test(R('apps/web/app/admin/page.tsx')), 'admin index only redirects');

// ---------- 3. secrets never reach the browser
const clientFiles = walk('apps/web').filter((p) => /\.(tsx?|jsx?)$/.test(p) && !p.includes('node_modules') && !p.includes('.next') && /^['"]use client['"]/.test(R(p).trim()));
ok(clientFiles.length > 10, `found client components (${clientFiles.length})`);
for (const p of clientFiles) { const s = R(p); ok(!/process\.env\.(SUPABASE_SERVICE_ROLE_KEY|ADMIN_EMAILS|INVITE_SECRET)|createServiceClient|from ['"][^'"]*supabase-server['"]/.test(s), `no server secret or server client used in client file: ${p}`); }
const envFiles = ['.env.example', 'apps/web/.env.example'].filter(existsSync);
for (const e of envFiles) ok(!/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET|ADMIN)/.test(R(e)), `no secret exposed as NEXT_PUBLIC in ${e}`);
ok(!/NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET)/.test(walk('apps/web').filter((p) => /\.(ts|tsx|js|mjs)$/.test(p) && !p.includes('node_modules') && !p.includes('.next')).map(R).join('\n')), 'no NEXT_PUBLIC secret name anywhere in the web app');

// ---------- 4. sensitive routes write the audit trail, and never a password
const MUST: Record<string, string[]> = {
  'apps/web/app/api/admin/payments/[id]/route.ts': ['payment.${action}'],
  'apps/web/app/api/admin/students/route.ts': ['student.create'],
  'apps/web/app/api/admin/students/[id]/route.ts': ['student.password_reset', 'student.plan_change'],
  'apps/web/app/api/admin/devices/reset/route.ts': ['device.reset'],
  'apps/web/app/api/admin/data-requests/execute/route.ts': ['data_request.delete_account', 'data_request.cancel'],
  'apps/web/app/api/admin/partners/[id]/route.ts': ['partner.'],
  'apps/web/app/api/admin/teachers/[id]/route.ts': ['teacher.password_reset', 'teacher.'],
  'apps/web/app/api/admin/teachers/route.ts': ['teacher.create'],
  'apps/web/app/api/admin/commerce/route.ts': ['commerce.'],
  'apps/web/app/api/admin/commerce/export/route.ts': ['export.download'],
  'apps/web/app/api/admin/reviews/apply/route.ts': ['review.'],
  'apps/web/app/api/admin/quality/route.ts': ['quality.signoff', 'quality.promote', 'quality.demote'],
  'apps/web/app/api/admin/ai/route.ts': ['ai.'],
};
for (const [p, acts] of Object.entries(MUST)) { const s = R(p); ok(/writeAudit\(/.test(s), `writes the audit trail: ${p}`); for (const a of acts) ok(s.includes(a), `${p} records ${a}`); }
for (const p of Object.keys(MUST)) { for (const m of R(p).matchAll(/writeAudit\([^\n]*\)/g)) ok(!/password|newPassword|\bpw\b/i.test(m[0].replace(/password_reset/g, '')), `audit call carries no password: ${p}`); }
// the existing audited areas keep working
for (const p of ['packages/core/control-centre/store.ts', 'packages/core/invitations/store.ts', 'packages/core/admin-team/store.ts']) ok(/writeAudit\(/.test(R(p)), `still audited: ${p}`);

// ---------- 5. writeAudit / listAudit behaviour
function fakeAudit(opts: { oldSchema?: boolean } = {}) {
  const rows: any[] = []; let calls = 0;
  const client: any = { from: (t: string) => ({
    insert: async (r: any) => { calls++; if (t !== 'audit_logs') return { error: { message: 'x' } }; if (opts.oldSchema && ('target_account' in r || 'reason' in r || 'outcome' in r || 'actor_role' in r || 'request_id' in r)) return { error: { code: '42703', message: 'column does not exist' } }; rows.push(r); return { error: null }; },
    select: (c: string) => { const q: any = { _eq: [] as any[], order: () => q, limit: () => q, ilike: () => q, eq: (k: string, v: any) => (q._eq.push([k, v]), q), then: (res: any) => res(opts.oldSchema && /target_account/.test(c) ? { data: null, error: { message: 'no column' } } : { data: rows.filter((r) => q._eq.every(([k, v]: any) => r[k] === v)), error: null }) }; return q; },
  }) };
  return { client, rows, calls: () => calls };
}
(async () => {
  const a = fakeAudit();
  await writeAudit(a.client, { actorEmail: 'founder@x.in', action: 'payment.confirm', entity: 'pilot_payment', entityId: 'p1', targetAccount: 'stu-1', reason: 'UPI seen', outcome: 'success', actorRole: 'super_admin', requestId: 'r1', detail: { password: 'abc', token: 't', plan: 'pro', answer: 'x', prompt: 'p', apiKey: 'k' } });
  const r = a.rows[0];
  ok(a.rows.length === 1, 'one audit row written');
  ok(r.target_account === 'stu-1' && r.reason === 'UPI seen' && r.outcome === 'success' && r.actor_role === 'super_admin' && r.request_id === 'r1', 'new fields are stored');
  ok(r.detail.plan === 'pro' && !('password' in r.detail) && !('token' in r.detail) && !('answer' in r.detail) && !('prompt' in r.detail) && !('apiKey' in r.detail), 'secret-looking fields are dropped from detail');
  await writeAudit(a.client, { action: 'x', entity: 'y', detail: { note: 'z'.repeat(500) } });
  ok(a.rows[1].detail.note.length === 200, 'long text is cut to 200 characters');
  await writeAudit(a.client, { action: 'a'.repeat(300), entity: 'e' });
  ok(a.rows[2].action.length === 80, 'action is cut to 80 characters');

  const old = fakeAudit({ oldSchema: true });
  await writeAudit(old.client, { actorEmail: 'f@x.in', action: 'student.create', entity: 'student', targetAccount: 'stu-9', outcome: 'success' });
  ok(old.rows.length === 1 && !('target_account' in old.rows[0]), 'before migration 0057 the record is still kept (without new columns)');
  ok(old.rows[0].detail.target_account === 'stu-9' && old.rows[0].detail.outcome === 'success', 'before 0057 the new facts are kept inside detail');
  ok(old.calls() === 2, 'one retry only');

  const boom: any = { from: () => { throw new Error('db down'); } };
  let threw = false; try { await writeAudit(boom, { action: 'a', entity: 'b' }); } catch { threw = true; }
  ok(!threw, 'an audit failure never stops the action');
  const boom2: any = { from: () => ({ insert: async () => { throw new Error('x'); } }) };
  threw = false; try { await writeAudit(boom2, { action: 'a', entity: 'b', targetAccount: 't' }); } catch { threw = true; }
  ok(!threw, 'a throwing insert never stops the action');

  const lst = await listAudit(a.client, 50, {});
  ok(Array.isArray(lst) && lst.length === 3, 'listAudit returns rows');
  const lst2 = await listAudit(old.client, 50, { target: 'stu-9' });
  ok(Array.isArray(lst2), 'listAudit survives the old schema');

  // ---------- 6. migration 0057 text
  const m = R('packages/db/migrations/0057_audit_trail.sql');
  ok(/add column if not exists target_account/.test(m) && /add column if not exists outcome/.test(m) && /add column if not exists reason/.test(m), '0057 adds the new columns safely');
  ok(/before update or delete on public\.audit_logs/.test(m) && /before truncate on public\.audit_logs/.test(m), '0057 blocks update, delete and truncate');
  ok(/set search_path = public, pg_temp/.test(m), '0057 functions have a fixed search path');
  ok(/drop trigger if exists trg_audit_logs_no_update_delete/.test(m), '0057 is re-runnable');
  ok(!/drop table|truncate table|delete from/i.test(m.replace(/--.*$/gm, '')), '0057 deletes nothing');
  ok(/where not exists/.test(m), '0057 changelog insert is guarded');

  // ---------- 7. the audit page
  const pg = R('apps/web/app/admin/audit-log/page.tsx');
  ok(/adminPageGate\(\)/.test(pg), 'audit page is Super Admin only');
  ok(!/\.delete\(|\.update\(/.test(pg), 'audit page cannot change records');

  console.log(`t91: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
