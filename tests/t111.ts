// t111: no table can widen a phone screen (v111). A static scan, NOT a rendered check.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const css = R('apps/web/app/globals.css');
const rule = (css.match(/\.data-table\s*\{[^}]*\}/) ?? [''])[0];
ok(/overflow-x:\s*auto/.test(rule) && /max-width:\s*100%/.test(rule) && /display:\s*block/.test(rule), '.data-table scrolls inside its own box');

const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = join(d, x); if (x === 'node_modules' || x === '.next') return []; return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(x) ? [p] : []; });
// Admin-only screens are used on a computer; they are listed so a NEW table cannot slip in unchecked.
const ADMIN_ONLY = /\/admin\/|components\/(ai\/|AdminReferral|FinancialSimulator|AdminConfiguration)/;
let seen = 0; const bad: string[] = [];
for (const p of walk('apps/web/app').concat(walk('apps/web/components'))) {
  if (ADMIN_ONLY.test(p)) continue;
  const lines = R(p).split('\n');
  lines.forEach((l, i) => {
    if (!/<table\b/.test(l)) return; seen++;
    const near = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
    if (!/data-table/.test(l) && !/overflowX:\s*'auto'/.test(near)) bad.push(`${p}:${i + 1}`);
  });
}
ok(seen >= 8, `scanned ${seen} tables on public and signed-in screens`);
ok(bad.length === 0, `every table scrolls on its own or uses data-table: ${bad.join(', ')}`);
console.log(`t111: ${n - f}/${n} passed`); if (f) process.exit(1);
