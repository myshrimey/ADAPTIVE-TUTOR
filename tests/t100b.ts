// t100b: the Testing and QA page with recording (v100). Renders to HTML with fakes (no browser, no database).
// Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t100b.ts
import { renderToStaticMarkup } from 'react-dom/server';
import { REGISTRY } from '../packages/core/control-centre/registry-data';
import { QA_CHECKLISTS, QA_KINDS } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(globalThis as any).React = require('react');
const Module = require('module'); const orig = Module._load;
let mode: 'rows' | 'none' | 'broken' = 'rows';
const rows = [
  { item_id: 'QA-ST-01', result: 'pass', note: 'looked right', app_version: 'v100', tested_at: '2026-11-03T10:00:00Z' },
  { item_id: 'QA-ST-02', result: 'fail', note: null, app_version: 'v99', tested_at: '2026-11-02T10:00:00Z' },
];
Module._load = function (req: string, ...rest: any[]) {
  if (req === '@/lib/admin-page') return { adminPageGate: async () => ({ email: 'founder@x.com', superAdmin: true }), AdminNav: () => null };
  if (req === '@/lib/control') return { getControl: async () => ({ reg: REGISTRY, source: 'bundled' }) };
  if (req === '@/lib/supabase-server') return { createServiceClient: () => ({ from: () => ({ select: () => ({ order: () => ({ limit: async () => (mode === 'broken' ? { data: null, error: { message: 'relation does not exist' } } : { data: mode === 'rows' ? rows : [], error: null }) }) }) }) }) };
  if (req === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
  return orig.call(this, req, ...rest);
};
const render = async () => renderToStaticMarkup(await require('../apps/web/app/admin/control/testing/page').default());
(async () => {
  mode = 'rows'; let h = await render();
  const total = QA_KINDS.reduce((a, k) => a + QA_CHECKLISTS[k].length, 0);
  ok((h.match(/aria-label="Note for QA-/g) ?? []).length === total, `a recorder for every one of the ${total} checklist items`);
  ok(h.includes('Worked (2026-11-03, v100) - looked right') && h.includes('Did not work (2026-11-02, v99)'), 'last result, date, version and note are shown');
  ok(/Student checklist - 1 worked, 1 did not work, 0 could not try, \d+ not tried \(of 14\)/.test(h), 'per-checklist summary');
  ok(h.includes('Not tried yet'), 'items without a result say "Not tried yet"');
  ok(h.includes('changes no status and accepts nothing') && h.includes('only you accept'), 'page says recording accepts nothing');
  ok(!/Saved results cannot be read/.test(h), 'no warning when the table works');
  mode = 'none'; h = await render();
  ok(!/Worked \(|Did not work \(/.test(h) && h.includes('Not tried yet') && /Student checklist - 0 worked, 0 did not work, 0 could not try, 14 not tried \(of 14\)/.test(h), 'empty history = everything not tried');
  mode = 'broken'; h = await render();
  ok(h.includes('Saved results cannot be read yet') && h.includes('npm run db:migrate') && h.includes('aria-label="Note for QA-ST-01"'), 'table missing: clear message, page still works, never "worked" by default');
  ok(!/Worked \(/.test(h), 'a page that cannot read results never shows a pass');
  console.log(`t100b: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
