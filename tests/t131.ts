// t131: ratchet for the tutor-loop tables that still allow direct student writes (v131). The count of signed-in-client write sites may only go DOWN.
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const PINNED: Record<string, number> = { diagnostic_answers: 1, diagnostic_attempts: 3, learning_sessions: 5, mastery_states: 2, messages: 4, misconceptions: 2, question_attempts: 1 };
export function sites(src: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of src.matchAll(new RegExp(`([\\w.()]+?)\\s*\\.from\\('(${Object.keys(PINNED).join('|')})'\\)`, 'g'))) {
    const chain = src.slice(m.index! + m[0].length, m.index! + m[0].length + 400).split(/;|\n\s*\n/)[0];
    if (!/\.(insert|update|upsert|delete)\(/.test(chain)) continue;
    if (/service|svc|admin/i.test(m[1])) continue;
    out[m[2]] = (out[m[2]] || 0) + 1;
  }
  return out;
}
const total: Record<string, number> = {};
const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.next') continue; const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) for (const [t, c] of Object.entries(sites(R(p)))) total[t] = (total[t] || 0) + c; } };
walk('packages/core'); walk('apps/web');
for (const [t, max] of Object.entries(PINNED)) {
  const c = total[t] || 0;
  ok(c <= max, `${t}: ${c} signed-in write sites, pinned maximum ${max} (a new one must not be added; if you removed one, lower the pin)`);
}
ok(Object.values(total).reduce((a, b) => a + b, 0) <= 18, 'total signed-in write sites on the 7 tutor-loop tables is at most 18');
// the scan itself works
ok(sites("await supabase.from('messages').insert({ a: 1 });").messages === 1, 'scan flags a signed-in insert');
ok(Object.keys(sites("await service.from('messages').insert({ a: 1 });")).length === 0, 'scan ignores a server-key insert');
ok(Object.keys(sites("const { data } = await supabase.from('messages').select('*');")).length === 0, 'scan ignores reads');
console.log(`t131: ${n - f}/${n} passed`); if (f) process.exit(1);
