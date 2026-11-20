// t135: a check constraint that several migrations redefine must allow the SAME values in every file, because every migration re-runs from the start
// and an earlier, narrower list fails as soon as a row with a newer value exists (this broke the founder's `npm run db:migrate` at 0016 on 2026-11-19).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const dir = 'packages/db/migrations';
const defs: Record<string, { file: string; vals: string[] }[]> = {};
for (const file of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const s = readFileSync(`${dir}/${file}`, 'utf8').replace(/--[^\n]*/g, '');
  for (const m of s.matchAll(/add constraint\s+(\w+)\s+check\s*\(\s*\w+\s+in\s*\(([^)]*)\)\s*\)/gi)) {
    (defs[m[1]] ||= []).push({ file, vals: [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]).sort() });
  }
}
const names = Object.keys(defs).filter((k) => defs[k].length > 1);
ok(names.length >= 3, 'the scan finds the known repeated constraints: ' + names.join());
for (const k of names) {
  const last = defs[k][defs[k].length - 1].vals.join('|');
  for (const d of defs[k]) ok(d.vals.join('|') === last, `${k}: ${d.file} allows the same values as the newest definition`);
}
ok(defs['users_role_check'].every((d) => d.vals.includes('tutor') && d.vals.includes('centre')), 'users_role_check always includes tutor and centre');
ok(defs['mock_exams_kind_check'].every((d) => d.vals.includes('blueprint')), 'mock_exams_kind_check always includes blueprint');
console.log(`t135: ${n - f}/${n} passed`); if (f) process.exit(1);
