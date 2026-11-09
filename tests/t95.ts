// t95: deployment check (v95): probes match the migration files, classification, no secret values, version constants.
import { readFileSync, readdirSync } from 'fs';
import { DEPLOY_PROBES, MANUAL_CHECKS, ENV_CHECKS, APP_VERSION, DB_VERSION_EXPECTED, classifyProbe, runProbes, envReport, latestChangelogVersion } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const sql = readdirSync('packages/db/migrations').sort().map((x) => ({ name: x, text: R('packages/db/migrations/' + x) }));
const all = R('packages/db/schema.sql') + '\n' + sql.map((s) => s.text).join('\n');

(async () => {
  // ---- every probe names a table / column that a migration really creates, from the migration it claims
  for (const p of DEPLOY_PROBES) {
    const file = sql.find((s) => s.name.startsWith(p.migration + '_'));
    ok(!!file, `${p.migration}: migration file exists`);
    const creates = new RegExp(`create table( if not exists)? (public\\.)?${p.table}\\b`, 'i').test(all);
    ok(creates, `${p.migration}: table ${p.table} is created by a migration or the schema`);
    if (p.column) ok(new RegExp(`${p.table}[\\s\\S]{0,400}${p.column}`, 'i').test(file!.text) || new RegExp(`add column( if not exists)? ${p.column}\\b`, 'i').test(file!.text), `${p.migration}: column ${p.column} comes from that migration`);
    else ok(new RegExp(`create table( if not exists)? (public\\.)?${p.table}\\b`, 'i').test(file!.text), `${p.migration}: ${p.table} is created by exactly that migration`);
  }
  ok(new Set(DEPLOY_PROBES.map((p) => p.migration)).size === DEPLOY_PROBES.length, 'one probe per migration');
  ok(DEPLOY_PROBES.some((p) => p.migration === '0056') && DEPLOY_PROBES.some((p) => p.migration === '0057'), 'the newest database changes are probed');

  // ---- version constants agree with the repository
  const dbVersions = [...all.matchAll(/'(v\d+)',\s*'/g)].map((m) => parseInt(m[1].slice(1))).filter((x) => x >= 60);
  ok(DB_VERSION_EXPECTED === 'v' + Math.max(...dbVersions), `DB_VERSION_EXPECTED (${DB_VERSION_EXPECTED}) is the newest version a migration writes to system_changelog (v${Math.max(...dbVersions)})`);
  const heads = [...R('docs/BUILD_LOG.md').matchAll(/^## (v\d+)\b/gm)].map((m) => parseInt(m[1].slice(1)));
  ok(APP_VERSION === 'v' + Math.max(...heads), `APP_VERSION (${APP_VERSION}) is the newest version in BUILD_LOG.md (v${Math.max(...heads)})`);
  ok(/Latest delivery - v\d+/.test(R('docs/RESUME_HERE.md')) && R('docs/RESUME_HERE.md').match(/Latest delivery - (v\d+)/)![1] === APP_VERSION, 'RESUME_HERE names the same latest version');

  // ---- classification
  ok(classifyProbe(null) === 'applied' && classifyProbe(undefined) === 'applied', 'no error = applied');
  for (const e of [{ code: '42P01' }, { code: '42703' }, { code: 'PGRST205' }, { message: 'column audit_logs.target_account does not exist' }, { message: 'Could not find the table public.x in the schema cache' }]) ok(classifyProbe(e) === 'not_applied', `missing table/column is not_applied: ${JSON.stringify(e)}`);
  for (const e of [{ code: '42501', message: 'permission denied' }, { message: 'fetch failed' }, { code: '57014' }]) ok(classifyProbe(e) === 'unknown', `other failures are unknown, never applied: ${JSON.stringify(e)}`);

  // ---- runProbes with fake clients; only ever a zero-row select
  const calls: string[] = [];
  const mk = (missing: string[], boom = false): any => ({ from: (t: string) => ({ select: (c: string) => ({ limit: async (nn: number) => { calls.push(`${t}.${c}.${nn}`); if (boom) throw new Error('down'); return { error: missing.includes(t) ? { code: '42P01', message: 'relation does not exist' } : null }; } }) }) });
  const good = await runProbes(mk([]));
  ok(good.length === DEPLOY_PROBES.length && good.every((r) => r.result === 'applied'), 'all applied on a migrated database');
  ok(calls.every((c) => c.endsWith('.0')), 'every probe reads zero rows');
  const part = await runProbes(mk(['control_prompts', 'audit_logs']));
  ok(part.filter((r) => r.result === 'not_applied').map((r) => r.migration).join() === '0056,0057' && part.filter((r) => r.result === 'applied').length === DEPLOY_PROBES.length - 2, 'missing 0056/0057 are reported by number');
  ok((await runProbes(mk([], true))).every((r) => r.result === 'unknown'), 'a database that is down is "could not check", not "applied"');

  // ---- settings: present or missing only
  const secret = 'SUPER-SECRET-VALUE-123';
  const rep = envReport({ ADMIN_EMAILS: 'founder@x.in', SUPABASE_SERVICE_ROLE_KEY: secret, NEXT_PUBLIC_SUPABASE_URL: '  ' });
  ok(!JSON.stringify(rep).includes(secret) && !JSON.stringify(rep).includes('founder@x.in'), 'no setting value is ever returned');
  ok(rep.find((r) => r.name === 'ADMIN_EMAILS')!.present && rep.find((r) => r.name === 'SUPABASE_SERVICE_ROLE_KEY')!.present && !rep.find((r) => r.name === 'NEXT_PUBLIC_SUPABASE_URL')!.present && !rep.find((r) => r.name === 'INVITE_SECRET')!.present, 'present/missing is right (blank counts as missing)');
  ok(ENV_CHECKS.filter((e) => e.required).length === 4 && !ENV_CHECKS.find((e) => e.name === 'INVITE_SECRET')!.required, 'required vs optional');

  // ---- latest changelog version
  const lv = async (rows: any[] | null, boom = false) => latestChangelogVersion({ from: () => ({ select: () => ({ order: () => ({ limit: async () => { if (boom) throw new Error('x'); return { data: rows }; } }) }) }) } as any);
  ok((await lv([{ version: 'v9' }, { version: 'v91' }, { version: 'v90' }, { version: 'x' }])) === 'v91', 'numeric, not text, ordering (v91 beats v9)');
  ok((await lv([])) === null && (await lv(null)) === null && (await lv(null, true)) === null, 'empty or broken changelog gives null');

  // ---- manual SQL is read only
  ok(MANUAL_CHECKS.length === 4 && MANUAL_CHECKS.every((c) => /^\s*select\b/i.test(c.sql) && !/;\s*\S/.test(c.sql.trim()) && !/\b(insert|update|delete|drop|alter|create|truncate|grant)\b/i.test(c.sql)), 'the SQL we ask the founder to paste only reads');

  // ---- code rules
  const mod = R('packages/core/deploy-check/index.ts').replace(/\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '');
  ok(!/\.(insert|update|delete|upsert)\(|\.rpc\(/.test(mod), 'module cannot write');
  const page = R('apps/web/app/admin/deploy-check/page.tsx');
  ok(/adminPageGate\(\)/.test(page) && !/^['"]use client['"]/.test(page.trim()) && !/fetch\(|method=["']post/i.test(page), 'page is Super Admin only and has no write path');
  ok(!/process\.env\.[A-Z_]+/.test(page.replace(/envReport\(process\.env\)/, '')) && !/process\.env\[/.test(page), 'page never reads a setting value directly');
  ok(/deploy-check/.test(R('apps/web/lib/admin-menu.ts')), 'page is in the menu');
  console.log(`t95: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
