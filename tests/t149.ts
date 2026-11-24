// t149: the shared core package must stay safe for the browser bundle (v149). v140 imported 'node:crypto' inside core, and because
// client components import from the one barrel (packages/core/index.ts), the Vercel build failed ("UnhandledSchemeError: node:crypto").
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? (x === 'node_modules' ? [] : walk(p)) : /\.(ts|tsx)$/.test(x) ? [p] : []; });
const core = walk('packages/core');
const nodeScheme = core.filter((p) => /(from|require\()\s*['"]node:/.test(readFileSync(p, 'utf8')));
ok(nodeScheme.length === 0, `no 'node:' import anywhere in packages/core (found: ${nodeScheme.join(', ')})`);
// Server-only Node modules that the browser bundle cannot take. Only 'crypto' and 'zlib' (which Next supplies stand-ins for; both build today) are allowed in core.
const bad = core.filter((p) => /from\s*['"](fs|path|os|child_process|net|tls|http|https|stream|worker_threads|dns)['"]/.test(readFileSync(p, 'utf8')));
ok(bad.length === 0, `core imports no server-only Node module (found: ${bad.join(', ')})`);
const vl = readFileSync('packages/core/view-as/logic.ts', 'utf8');
ok(/from 'crypto'/.test(vl) && !/node:crypto/.test(vl), 'the View As ticket code uses plain crypto');
ok(readFileSync('CLAUDE.md', 'utf8').includes('next build') && /v149/.test(readFileSync('CLAUDE.md', 'utf8')), 'CLAUDE.md tells future sessions to run a real next build before delivering');
console.log(`t149: ${n - f}/${n} passed`); if (f) process.exit(1);
