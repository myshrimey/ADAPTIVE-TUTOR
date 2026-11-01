// t92b: renders the account directory and snapshot pages to HTML with fake data (no browser, no database).
// Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t92b.ts
import { renderToStaticMarkup } from 'react-dom/server';
import { fakeDb } from './fakedb2';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(globalThis as any).React = require('react');
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const T: Record<string, any[]> = {
  users: [{ id: 'aaaaaaaa-1111', auth_user_id: 'x1', email: 'aarav.sharma@gmail.com', role: 'student', created_at: ago(20), source: 'google' }, { id: 'bbbbbbbb-2222', auth_user_id: 'x2', email: 'sunita@gmail.com', role: 'parent', created_at: ago(19), source: null }],
  students: [{ id: 's1', user_id: 'aaaaaaaa-1111', display_name: 'Aarav Sharma', grade: 'CBSE-10' }],
  student_access: [{ student_id: 's1', plan_code: 'pro', access_until: '2027-01-01', subject_limit: 2, granted_at: ago(19), updated_at: ago(19) }],
  adult_profiles: [{ user_id: 'bbbbbbbb-2222', role: 'parent', display_name: 'Sunita Sharma', status: 'active' }],
  student_links: [{ student_id: 's1', adult_user_id: 'bbbbbbbb-2222', link_type: 'parent', status: 'active', created_at: ago(18) }],
  learning_events: [{ student_id: 's1', event_type: 'session_started', created_at: ago(2) }], audit_logs: [],
};
const db: any = fakeDb(T);
const Module = require('module'); const orig = Module._load;
Module._load = function (req: string, ...rest: any[]) {
  if (req === '@/lib/admin-page') return { adminPageGate: async () => ({ email: 'founder@x.com', superAdmin: true }), AdminNav: () => null };
  if (req === '@/lib/supabase-server') return { createServiceClient: () => db };
  return orig.call(this, req, ...rest);
};
const render = async (mod: string, props: any) => renderToStaticMarkup(await require(mod).default(props));
(async () => {
  const dir = '../apps/web/app/admin/accounts';
  const h = await render(dir + '/page', { searchParams: Promise.resolve({}) });
  ok(h.includes('Account directory') && h.includes('aaaaaaaa') && h.includes('bbbbbbbb'), 'directory lists both accounts');
  ok(h.includes('aa***@gmail.com') && !h.includes('aarav.sharma'), 'email is masked in the page');
  ok(h.includes('A. S.') && !h.includes('Aarav Sharma') && !h.includes('Sunita Sharma'), 'only initials are shown');
  ok(h.includes('2 shown of 2'), 'counts shown');
  ok(h.includes('Read only') && h.includes('recorded in the Audit log'), 'read-only and audit notice shown');
  const fl = await render(dir + '/page', { searchParams: Promise.resolve({ kind: 'parent' }) });
  ok(fl.includes('bbbbbbbb') && !fl.includes('>aaaaaaaa<') && fl.includes('1 shown of 2'), 'filter narrows the list');
  const none = await render(dir + '/page', { searchParams: Promise.resolve({ q: 'qqqq' }) });
  ok(none.includes('No accounts match'), 'empty message');
  ok(T.audit_logs.filter((a) => a.action === 'account.directory_view').length === 3, 'every directory open is audited');
  const s = await render(dir + '/[id]/page', { params: Promise.resolve({ id: 'aaaaaaaa-1111' }) });
  ok(s.includes('Account aaaaaaaa') && s.includes('pro') && s.includes('Timeline') && s.includes('Account created'), 'snapshot shows plan and timeline');
  ok(!s.includes('aarav.sharma') && !s.includes('Aarav Sharma') && s.includes('aa***@gmail.com'), 'snapshot is masked');
  ok(s.includes('never sign you in as someone else'), 'snapshot says there is no view-as');
  const nf = await render(dir + '/[id]/page', { params: Promise.resolve({ id: 'nope' }) });
  ok(nf.includes('Account not found'), 'unknown account page');
  ok(T.audit_logs.filter((a) => a.action === 'account.view').length === 2, 'snapshot opens are audited');
  console.log(`t92b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
