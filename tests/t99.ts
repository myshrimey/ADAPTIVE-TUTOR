// t99: dependency security facts the v99 review relied on (v99). If one of these changes, the review must be redone.
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { if (x === 'node_modules' || x === '.next') return []; const p = join(d, x); return statSync(p).isDirectory() ? walk(p) : [p]; });
const web = JSON.parse(R('apps/web/package.json'));
const ver = (s: string) => s.replace(/^[^\d]*/, '').split('.').map(Number);
const gte = (a: number[], b: number[]) => { for (let i = 0; i < 3; i++) { if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0); } return true; };

// Next.js 15.5.28 is the official fix (nextjs.org security update of 14 Oct 2026) for the image-optimiser SVG remote-code flaw,
// the Server Actions denial of service and the "use cache" flaw. Pinned exactly so a stray install cannot go backwards.
ok(/^\d+\.\d+\.\d+$/.test(web.dependencies.next), 'next is pinned to an exact version');
ok(gte(ver(web.dependencies.next), [15, 5, 28]) && ver(web.dependencies.next)[0] === 15, `next is 15.5.28 or newer on the 15 line (${web.dependencies.next})`);
const lock = JSON.parse(R('package-lock.json'));
ok(lock.packages['node_modules/next'].version === web.dependencies.next, 'the lock file agrees with package.json');

// Why the remaining audit warnings are not reachable (re-check if any of these turn false).
const src = walk('apps/web').filter((p) => /\.(ts|tsx|js|mjs)$/.test(p));
const text = src.map((p) => [p, R(p)] as const);
ok(!text.some(([, t]) => /^\s*['"]use server['"]/m.test(t)), 'no Server Actions anywhere (the Server Actions denial-of-service needs one)');
ok(!text.some(([, t]) => /['"]use cache['"]|cacheComponents|dynamicIO/.test(t)), 'no "use cache" / Cache Components (the use-cache flaw needs it)');
ok(!text.some(([p, t]) => /from ['"]next\/image['"]/.test(t) && !p.includes('node_modules')), 'no next/image (the image optimiser is not used by any page)');
const cfg = R('apps/web/next.config.js');
ok(!/images\s*:|dangerouslyAllowSVG|remotePatterns/.test(cfg), 'next.config has no image settings (no remote images, no SVG opt-in)');
const pdf = R('apps/web/lib/download-pdf.ts');
ok(/jspdf/.test(pdf) && !/\.html\(/.test(pdf), 'jsPDF is used only for text and images, never its .html() (the only part that uses DOMPurify)');
ok(!text.some(([, t]) => /dompurify|DOMPurify/i.test(t)), 'the app never calls DOMPurify itself');
ok(existsSync('docs/DEPENDENCY_SECURITY.md') && /15\.5\.28/.test(R('docs/DEPENDENCY_SECURITY.md')) && /not (a )?(legal|security) (advice|audit)|not a full security audit/i.test(R('docs/DEPENDENCY_SECURITY.md')), 'the written review exists and states its limits');
console.log(`t99: ${n - f}/${n} passed`); if (f) process.exit(1);
