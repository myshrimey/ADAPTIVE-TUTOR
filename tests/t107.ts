// t107: the phone header must not push the page wider than the screen (v107). Static guard; the real width check was run in a browser at 320/360/375/414px.
import { readFileSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const css = readFileSync('apps/web/app/globals.css', 'utf8');
const hdr = readFileSync('apps/web/components/SiteHeader.tsx', 'utf8');
const m = css.match(/@media \(max-width: 900px\) \{\s*\.site-header__nav,([\s\S]*?)\}/);
ok(!!m, 'the 900px phone header rule exists');
ok(!!m && /\.site-header__right a\.nav-link/.test(m[1]), 'the wide "Parents & partners" link is hidden on phones');
ok(/nav-drawer__link">Parents &amp; partners/.test(hdr), 'that link is still reachable from the phone drawer');
ok(/@media \(max-width: 360px\)[\s\S]*\.site-header__row[\s\S]*\.wordmark/.test(css), 'very small phones get a tighter header');
ok(/className="nav-burger"/.test(hdr), 'the menu button is still there');
console.log(`t107: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
