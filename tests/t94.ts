// t94: decisions recorded, retention dry run, View As design, purge script safety (v94).
import { readFileSync, existsSync } from 'fs';
import { fakeDb } from './fakedb2';
import { RETENTION_RULES, RETENTION_EXCLUDED, cutoffFor, loadRetentionReport } from '../packages/core';
import { REGISTRY } from '../packages/core/control-centre/registry-data';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const NOW = new Date('2026-11-01T00:00:00Z');

(async () => {
  // ---- decisions
  const made = (id: string) => REGISTRY.decisions.find((d) => d.id === id && d.kind === 'made');
  for (const id of ['FD-11', 'FD-12', 'FD-13', 'FD-14', 'FD-15']) ok(!!made(id) && /2026-11-01/.test(made(id)!.decided_on ?? ''), `${id} recorded as decided`);
  ok(/INTERIM/.test(made('FD-13')!.decision) && /NOT legal advice/i.test(made('FD-13')!.decision) && /Nothing is deleted automatically/.test(made('FD-13')!.decision), 'D3 is recorded as interim, not legal advice, no automatic deletion');
  ok(/never a login session as another person/.test(made('FD-12')!.decision) && /NOT built/.test(made('FD-12')!.decision), 'D2 keeps the no-impersonation rule and says View As is not built');
  ok(/Super Admin/.test(made('FD-15')!.decision), 'D6 is Super Admin only');
  const waiting = REGISTRY.decisions.filter((d) => d.kind === 'waiting');
  ok(waiting.length === 1 && waiting[0].id === 'D7', 'only the professional legal review (D7) is still waiting');
  ok(!/compl(y|iant|iance)\b.*guarantee|is compliant|we comply/i.test(JSON.stringify(REGISTRY.decisions)), 'no compliance claim in any decision');
  ok(REGISTRY.tasks.every((t) => !/Decision D[1-6]\b/.test(t.depends_on)), 'no task still waits for a decided decision');
  const t34 = REGISTRY.tasks.find((t) => t.id === 'TASK-034')!, t35 = REGISTRY.tasks.find((t) => t.id === 'TASK-035')!, t39 = REGISTRY.tasks.find((t) => t.id === 'TASK-039')!;
  ok(t34.status === 'READY FOR TESTING' && t35.status === 'NOT STARTED', 'design study done; View As itself NOT started');
  ok(t39.status === 'READY FOR TESTING', 'retention report task recorded');
  ok(REGISTRY.tasks.find((t) => t.id === 'TASK-040')!.status === 'BLOCKED' && REGISTRY.tasks.find((t) => t.id === 'TASK-041')!.status === 'NOT STARTED', 'legal review still blocks activity events');
  ok(REGISTRY.requirements.find((r) => r.code === 'R35')!.status === 'PARTIALLY COMPLETED', 'retention requirement is only partly done');

  // ---- retention rules
  ok(RETENTION_RULES.length === 7 && new Set(RETENTION_RULES.map((r) => r.table)).size === 7, 'seven rules, one per table');
  ok(RETENTION_RULES.find((r) => r.table === 'audit_logs')!.days === 1095 && RETENTION_RULES.filter((r) => r.table !== 'audit_logs').every((r) => r.days === 395), 'interim periods: audit 3 years, others about 13 months');
  const banned = ['learning_events', 'mastery_states', 'test_reports', 'written_attempts', 'pilot_payments', 'commerce_events', 'mock_credit_ledger', 'users', 'students', 'student_access', 'questions', 'data_requests'];
  ok(RETENTION_RULES.every((r) => !banned.includes(r.table)), 'no learning, payment, consent or account table is in the rules');
  ok(RETENTION_EXCLUDED.length === 3 && RETENTION_EXCLUDED.every((x) => x.why.length > 30), 'exclusions are explained');
  ok(cutoffFor(395, NOW).slice(0, 10) === '2025-10-02' && cutoffFor(1095, NOW).slice(0, 10) === '2023-11-02', 'cut-off dates');

  // ---- dry run counts, never changes anything
  const days = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();
  const T: Record<string, any[]> = {
    audit_logs: [{ at: days(2000) }, { at: days(10) }], page_views: [{ at: days(500) }, { at: days(500) }, { at: days(1) }], ai_usage: [{ created_at: days(1) }],
    signup_log: [], engagement_events: [{ created_at: days(400) }], account_devices: [{ last_seen: days(396) }, { last_seen: days(394) }], acquisition_touches: [{ at: days(30) }],
    learning_events: [{ created_at: days(900) }],
  };
  const before = JSON.stringify(T);
  const rep = await loadRetentionReport(fakeDb(T) as any, NOW);
  const get = (t: string) => rep.find((r) => r.table === t)!;
  ok(get('audit_logs').total === 2 && get('audit_logs').older === 1, 'audit counts');
  ok(get('page_views').total === 3 && get('page_views').older === 2, 'page view counts');
  ok(get('account_devices').older === 1 && get('engagement_events').older === 1 && get('ai_usage').older === 0 && get('signup_log').total === 0, 'other counts');
  ok(JSON.stringify(T) === before, 'dry run changed nothing');
  const broken = await loadRetentionReport({ from: () => ({ select: () => ({ lt: async () => ({ error: { message: 'x' }, count: null }), then: (r: any) => r({ error: { message: 'x' }, count: null }) }) }) } as any, NOW);
  ok(broken.every((r) => r.total === null && r.older === null), 'an unreadable table shows "not available", never 0');
  const thrower = await loadRetentionReport({ from: () => { throw new Error('boom'); } } as any, NOW);
  ok(thrower.every((r) => r.older === null), 'a throwing database is handled');

  // ---- source code never deletes
  const mod = R('packages/core/retention/index.ts').replace(/\/\/.*$/gm, '');
  ok(!/\.(delete|update|insert|upsert)\(|\.rpc\(/.test(mod), 'retention module has no write or delete call');
  const page = R('apps/web/app/admin/retention/page.tsx');
  ok(/adminPageGate\(\)/.test(page) && !/\.(delete|update|insert)\(|fetch\(|method=["']post/i.test(page.replace(/writeAudit\([^)]*\)/g, '')), 'page is Super Admin only and cannot delete');
  ok(/not legal advice/i.test(page) && /D7/.test(page) && /Nothing is deleted/.test(page), 'page says: interim, not legal advice, nothing deleted');
  ok(/\/admin\/retention/.test(R('apps/web/lib/admin-menu.ts')), 'page is in the menu');

  // ---- purge script safety
  const sql = R('scripts/retention/purge-older-than.sql'); const code = sql.replace(/--.*$/gm, '');
  ok(existsSync('scripts/retention/purge-older-than.sql') && /^\s*begin;/m.test(code) && /commit;/.test(code), 'purge script is one transaction');
  const dels = [...code.matchAll(/delete from public\.(\w+)\s+where\s+(\w+)\s*<\s*now\(\)\s*-\s*interval '(\d+) days'/g)];
  ok(dels.length === 7, 'seven deletes, each with a where clause and an age limit');
  ok(!/delete from [\w.]+\s*;/i.test(code) && !/truncate|drop /i.test(code), 'no unconditional delete, truncate or drop');
  for (const rule of RETENTION_RULES) ok(dels.some((d) => d[1] === rule.table && d[2] === rule.column && Number(d[3]) === rule.days), `script matches the rule for ${rule.table}`);
  ok(dels.every((d) => !banned.includes(d[1])), 'script never touches excluded tables');
  ok(/set local sahayak\.audit_purge = 'on';\s*\ndelete from public\.audit_logs/.test(code), 'the audit purge switch is local to the transaction and used only for the audit trail');
  ok(/NOT RUN BY ANYONE AUTOMATICALLY/.test(sql) && /NOT LEGAL ADVICE/.test(sql) && /backup/i.test(sql), 'script warns: manual, not legal advice, backup first');
  ok(!existsSync('apps/web/vercel.json') || !/retention|purge/i.test(R('apps/web/vercel.json')), 'no scheduled job runs a purge');
  ok(!/retention|purge/i.test(R('package.json')), 'no npm script runs a purge');

  // ---- View As design document
  const d = R('docs/sahayak-control-centre/VIEW_AS_DESIGN.md');
  ok(/DESIGN ONLY/.test(d) && /never a login session as another person/i.test(d) && /Rejected/.test(d), 'design says: design only, no impersonation');
  ok(/15 minutes/.test(d) && /read only/i.test(d) && /reason/i.test(d) && /static test/i.test(d) && /Threats/.test(d), 'design has expiry, read-only, reason, tests and a threat table');
  ok(!/\b(is|are) (built|implemented|done)\b/i.test(d.replace(/Step 1 \(built in v92\)/, '').replace(/NOT built/g, '').replace(/Nothing in this file is built/g, '').replace(/before step 2 is built/g, '')), 'design does not claim View As exists');
  ok(!existsSync('apps/web/app/admin/view-as') && !existsSync('packages/core/view-as'), 'no View As code exists');
  ok(!/signInWith|setSession|generateLink|createSession|impersonat/i.test(R('packages/core/accounts/store.ts')), 'still no session creation anywhere in the accounts code');

  console.log(`t94: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
