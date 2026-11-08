// t108: a "Control centre" shortcut in the admin top bar (v108). It only appears for people whose menu already includes the page.
import { readFileSync } from 'fs';
import { ADMIN_MENU } from '../apps/web/lib/admin-menu';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const src = readFileSync('apps/web/components/AdminMenu.tsx', 'utf8');
ok(/href="\/admin\/control"/.test(src) && /Control centre/.test(src), 'the top bar has a Control centre link');
ok(/MENU\.some\(\(g\) => g\.items\.some\(\(i\) => i\.href === '\/admin\/control'\)\)/.test(src), 'it shows only when the page is in that person\'s menu (team members never see it)');
ok(ADMIN_MENU.some((g) => g.items.some((i) => i.href === '/admin/control')), 'the page is in the full menu');
const perm = readFileSync('apps/web/lib/admin-menu.ts', 'utf8');
ok(!/PAGE_PERMISSION[\s\S]{0,400}'\/admin\/control'/.test(perm), 'no team permission opens the control centre');
ok(/Load from documents/.test(readFileSync('apps/web/components/ControlActions.tsx', 'utf8')) && /<ImportButton \/>/.test(readFileSync('apps/web/app/admin/control/page.tsx', 'utf8')), 'the Load from documents button is on the control centre page');
console.log(`t108: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
