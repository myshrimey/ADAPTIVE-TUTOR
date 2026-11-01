// t93b: renders the four new control-centre pages to HTML (shipped registry, no browser, no database).
// Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t93b.ts
import { renderToStaticMarkup } from 'react-dom/server';
import { REGISTRY } from '../packages/core/control-centre/registry-data';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(globalThis as any).React = require('react');
const Module = require('module'); const orig = Module._load;
let source: 'database' | 'bundled' = 'bundled'; const audits: any[] = [];
Module._load = function (req: string, ...rest: any[]) {
  if (req === '@/lib/admin-page') return { adminPageGate: async () => ({ email: 'founder@x.com', superAdmin: true }), AdminNav: () => null };
  if (req === '@/lib/control') return { getControl: async () => ({ reg: REGISTRY, source }) };
  if (req === '@/lib/admin') return { requireAdmin: async () => ({ email: 'founder@x.com', superAdmin: true }) };
  if (req === '@/lib/supabase-server') return { createServiceClient: () => ({ from: () => ({ insert: async (r: any) => { audits.push(r); return { error: null }; } }) }) };
  if (req === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
  return orig.call(this, req, ...rest);
};
const render = async (mod: string, props: any = {}) => renderToStaticMarkup(await require(mod).default(props));
(async () => {
  const dir = '../apps/web/app/admin/control';
  for (const src of ['bundled', 'database'] as const) {
    source = src;
    const cur = await render(dir + '/current/page');
    ok(cur.includes('Current execution') && cur.includes('SAH-PROMPT-0009') && cur.includes('Claude&#x27;s recommendation') && cur.includes('Waiting for your check'), `${src}: current page sections`);
    ok(cur.includes('/api/admin/control/resume') && cur.includes('never starts work'), `${src}: resume download link and read-only note`);
    ok(/TASK-03[0-9]/.test(cur) && cur.includes('D7'), `${src}: waiting tasks and decisions listed`);
    const dep = await render(dir + '/dependencies/page', { searchParams: Promise.resolve({}) });
    ok(dep.includes('Dependency register') && dep.includes('TASK-001') && dep.includes('TASK-062') && dep.includes('No broken links'), `${src}: dependency page lists all tasks and no problems`);
    const ready = await render(dir + '/dependencies/page', { searchParams: Promise.resolve({ state: 'ready' }) });
    ok(ready.includes('Ready to start') && !ready.includes('TASK-001</td>'), `${src}: filter hides finished tasks`);
    const qa = await render(dir + '/testing/page');
    ok(['Student checklist', 'Parent checklist', 'Tutor checklist', 'Coaching centre checklist', 'Teacher checklist', 'Founder (admin) checklist'].every((h) => qa.includes(h)), `${src}: all six checklists`);
    ok(qa.includes('QA-ST-01') && qa.includes('QA-AD-07') && qa.includes('TEST accounts') && !/passed|✔/.test(qa.replace(/Results are not saved/g, '')), `${src}: checklists show no results`);
    const his = await render(dir + '/history/page');
    ok(his.includes('EX-0001') && his.includes('EX-0004') && his.indexOf('EX-0004') < his.indexOf('EX-0001'), `${src}: history newest first`);
  }
  const rt = require('../apps/web/app/api/admin/control/resume/route');
  const res: Response = await rt.GET(); const body = await res.text();
  ok(res.status === 200 && /text\/plain/.test(res.headers.get('content-type') ?? '') && /attachment/.test(res.headers.get('content-disposition') ?? ''), 'resume downloads as a text file');
  ok(body.startsWith('SAHAYAK SESSION RESUME') && body.includes('SAH-PROMPT-0009'), 'resume body');
  ok(audits.some((a) => a.action === 'export.download' && a.entity === 'session_resume'), 'resume download is audited');
  console.log(`t93b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
