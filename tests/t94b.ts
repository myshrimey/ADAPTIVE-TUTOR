// t94b: renders the retention page (dry run) with fake data.
// Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t94b.ts
import { renderToStaticMarkup } from 'react-dom/server';
import { fakeDb } from './fakedb2';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(globalThis as any).React = require('react');
const old = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const T: Record<string, any[]> = { audit_logs: [{ at: old(2000) }, { at: old(5) }], page_views: [{ at: old(500) }, { at: old(500) }, { at: old(2) }], ai_usage: [], signup_log: [], engagement_events: [], account_devices: [], acquisition_touches: [], learning_events: [{ created_at: old(900) }] };
const db: any = fakeDb(T); const before = JSON.stringify(T);
const Module = require('module'); const orig = Module._load;
Module._load = function (req: string, ...rest: any[]) {
  if (req === '@/lib/admin-page') return { adminPageGate: async () => ({ email: 'founder@x.com', superAdmin: true }), AdminNav: () => null };
  if (req === '@/lib/supabase-server') return { createServiceClient: () => db };
  return orig.call(this, req, ...rest);
};
(async () => {
  const h = renderToStaticMarkup(await require('../apps/web/app/admin/retention/page').default());
  ok(h.includes('Data retention (dry run)') && h.includes('not legal advice') && h.includes('Nothing is deleted here'), 'page says dry run, not legal advice, nothing deleted');
  ok(h.includes('Admin audit trail') && h.includes('1095 days') && h.includes('395 days') && h.includes('Website visits'), 'rules shown');
  ok(h.includes('Never part of a clean-up') && h.includes('Learning events') && h.includes('Payments'), 'exclusions shown');
  ok(h.includes('scripts/retention/purge-older-than.sql') && h.includes('D7'), 'points to the owner-run script and D7');
  ok(JSON.stringify({ ...T, audit_logs: T.audit_logs.filter((r) => r.at) }) !== '' && T.page_views.length === 3 && T.learning_events.length === 1, 'no data row was removed');
  ok(T.audit_logs.length === 3 && T.audit_logs.some((r: any) => r.action === 'retention.view'), 'opening the page is audited (one new audit line, nothing removed)');
  console.log(`t94b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
