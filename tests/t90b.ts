// t90b: renders each control-centre page to HTML with the shipped registry (no browser, no database) to catch crashes in the page code.
// Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t90b.ts
import { renderToStaticMarkup } from 'react-dom/server';
import { REGISTRY } from '../packages/core/control-centre/registry-data';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(globalThis as any).React = require('react');
const Module = require('module'); const orig = Module._load;
let source: 'database' | 'bundled' = 'bundled';
Module._load = function (req: string, ...rest: any[]) {
  if (req === '@/lib/admin-page') return { adminPageGate: async () => ({ email: 'founder@x.com', superAdmin: true }), AdminNav: () => null };
  if (req === '@/lib/control') return { getControl: async () => ({ reg: REGISTRY, source }) };
  if (req === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
  return orig.call(this, req, ...rest);
};
const render = async (mod: string, props: any) => { const m = require(mod); return renderToStaticMarkup(await m.default(props)); };
(async () => {
  const dir = '../apps/web/app/admin/control';
  for (const src of ['bundled', 'database'] as const) {
    source = src;
    const home = await render(dir + '/page', { searchParams: Promise.resolve({}) });
    ok(home.includes('Resume report') && home.includes('SAH-PROMPT-0009') && home.includes('SAH-PROMPT-0001'), `${src}: overview lists prompts and resume report`);
    ok(home.includes('9</strong> master prompts') && home.includes('52</strong> requirements'), `${src}: resume numbers shown`);
    ok((src === 'bundled') === home.includes('read only. The database tables are not set up'), `${src}: source note is right`);
    ok((src === 'database') === home.includes('Priority for SAH-PROMPT-0009'), `${src}: priority control only when the database copy is used`);
    const filtered = await render(dir + '/page', { searchParams: Promise.resolve({ status: 'REGISTERED', q: 'v3' }) });
    ok(filtered.includes('SAH-PROMPT-0002') && !filtered.includes('SAH-PROMPT-0009</a>'), `${src}: filters narrow the prompt list`);
    const none = await render(dir + '/page', { searchParams: Promise.resolve({ q: 'qqqqzzzz' }) });
    ok(none.includes('No prompt matches'), `${src}: empty filter message`);
    const detail = await render(dir + '/prompts/[id]/page', { params: Promise.resolve({ id: 'SAH-PROMPT-0009' }) });
    ok(detail.includes('MASTER PROMPT: SAHAYAK FOUNDER COMMAND') && detail.includes('R41') && detail.includes('52</strong> requirements'), `${src}: prompt page shows original text and requirements`);
    ok((src === 'database') === detail.includes('Your acceptance of R41'), `${src}: acceptance control only with the database copy`);
    const old = await render(dir + '/prompts/[id]/page', { params: Promise.resolve({ id: 'SAH-PROMPT-0004' }) });
    ok(old.includes('Tracked by headline only') && old.includes('Not kept'), `${src}: older prompt is honest about missing text`);
    ok((await render(dir + '/prompts/[id]/page', { params: Promise.resolve({ id: 'NOPE' }) })).includes('Prompt not found'), `${src}: unknown prompt`);
    const obj = await render(dir + '/objectives/page', {});
    ok(obj.includes('O1') && obj.includes('O8') && obj.includes('TASK-015'), `${src}: objectives page lists objectives and tasks`);
    const tasks = await render(dir + '/tasks/page', { searchParams: Promise.resolve({}) });
    ok(tasks.includes('TASK-001') && tasks.includes('TASK-062') && (src === 'database') === tasks.includes('Only records your choice'), `${src}: tasks page and next button`);
    const t2 = await render(dir + '/tasks/page', { searchParams: Promise.resolve({ status: 'COMPLETED', sort: 'size' }) });
    ok(t2.includes('TASK-015') && !t2.includes('TASK-062'), `${src}: task filter works in the page`);
    const t3 = await render(dir + '/tasks/page', { searchParams: Promise.resolve({ sort: '<script>' }) });
    ok(!t3.includes('<script>'), `${src}: odd sort value is ignored`);
    const dec = await render(dir + '/decisions/page', {});
    ok(dec.includes('Waiting for you (1)') && dec.includes('D7') && dec.includes('FD-10') && dec.includes('FD-15'), `${src}: decisions page`);
  }
  console.log(`t90b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})().catch((e) => { console.log('FAIL crashed:', e?.message ?? e); process.exit(1); });
