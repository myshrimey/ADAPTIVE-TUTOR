// t102b: the "Get the app" button behaves correctly on each kind of device (v102). Runs the real component with a tiny hook runtime and
// fake browser objects (no browser, no network). Run with: npx tsx --tsconfig apps/web/tsconfig.json tests/t102b.ts
import { renderToStaticMarkup } from 'react-dom/server';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const realReact = require('react'); (globalThis as any).React = realReact;
const Module = require('module'); const orig = Module._load;

// --- tiny hook runtime
let store: any[] = [], idx = 0, effects: Array<() => any> = [], cleanups: Array<() => void> = [], path = '/dashboard';
const hooks = {
  useState: (init: any) => { const i = idx++; if (!(i in store)) store[i] = init; return [store[i], (v: any) => { store[i] = typeof v === 'function' ? v(store[i]) : v; }]; },
  useRef: (init: any) => { const i = idx++; if (!(i in store)) store[i] = { current: init }; return store[i]; },
  useEffect: (fn: () => any) => { effects.push(fn); },
};
Module._load = function (req: string, parent: any, ...rest: any[]) {
  if (req === 'react' && parent?.filename?.endsWith('InstallApp.tsx')) return { ...realReact, ...hooks };
  if (req === 'next/navigation') return { usePathname: () => path };
  return orig.call(this, req, parent, ...rest);
};
const Comp = require('../apps/web/components/InstallApp').InstallApp;

// --- fake browser
const listeners: Record<string, Array<(e: any) => void>> = {}; const calls: string[] = []; let session: Record<string, string> = {};
function setBrowser(o: { ua: string; touch?: number; standalone?: boolean; iosStandalone?: boolean; prod?: boolean; sessionBlocked?: boolean }) {
  for (const k of Object.keys(listeners)) delete listeners[k]; calls.length = 0; session = {};
  const g: any = globalThis;
  g.window = { addEventListener: (t: string, h: any) => { (listeners[t] ||= []).push(h); }, removeEventListener: () => {}, matchMedia: () => ({ matches: !!o.standalone }),
    fetch: () => { calls.push('fetch'); }, localStorage: { setItem: () => { calls.push('localStorage'); } } };
  Object.defineProperty(g, 'navigator', { configurable: true, value: { userAgent: o.ua, maxTouchPoints: o.touch ?? 0, standalone: o.iosStandalone, serviceWorker: { register: (u: string) => { calls.push('sw:' + u); return Promise.resolve(); } }, sendBeacon: () => { calls.push('beacon'); } } });
  g.sessionStorage = o.sessionBlocked ? { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } : { getItem: (k: string) => session[k] ?? null, setItem: (k: string, v: string) => { session[k] = v; } };
  (process.env as any).NODE_ENV = o.prod ? 'production' : 'test';
}
function render() { idx = 0; const el = Comp(); return el; }
function mount() { store = []; effects = []; render(); const es = effects.slice(); effects = []; for (const e of es) { const c = e(); if (typeof c === 'function') cleanups.push(c); } return render(); }
const html = (el: any) => (el ? renderToStaticMarkup(el) : '');
function find(el: any, pred: (e: any) => boolean): any { if (!el || typeof el !== 'object') return null; if (Array.isArray(el)) { for (const c of el) { const r = find(c, pred); if (r) return r; } return null; } if (pred(el)) return el; return find(el.props?.children, pred); }
const click = (el: any, label: RegExp) => { const b = find(el, (e) => e.type === 'button' && label.test(JSON.stringify(e.props?.children ?? '') + (e.props?.['aria-label'] ?? ''))); b.props.onClick(); effects = []; return render(); };
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

// 0. on the server (before the browser runs) it renders nothing, so there is no mismatch
store = []; effects = []; ok(render() === null, 'renders nothing until the browser has checked the device');

// 1. Android / Chrome with the install prompt
path = '/dashboard'; setBrowser({ ua: UA.android, prod: true }); let el = mount();
ok(html(el).includes('Get the app') && html(el).includes('data-compact="false"') && !html(el).includes('install-app__panel'), 'Android: big button, panel closed');
ok(calls.includes('sw:/sw.js'), 'the service worker is registered in production');
let prevented = false; const fakeEvt: any = { preventDefault: () => { prevented = true; }, prompt: async () => { calls.push('prompt'); }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
listeners['beforeinstallprompt'][0](fakeEvt); el = render();
ok(prevented, 'the browser mini-bar is held back so our button is the one place to install');
el = click(el, /Get the Sahayak app/); ok(html(el).includes('install-app__panel') && html(el).includes('>Install<'), 'press the button: panel opens with an Install button');
const inst = find(el, (e) => e.type === 'button' && e.props?.children === 'Install'); inst.props.onClick();
ok(calls.includes('prompt'), 'Install asks the browser to show its install question');

// 2. iPhone Safari: steps only, never an Install button
setBrowser({ ua: UA.iphone }); el = mount(); el = click(el, /Get the Sahayak app/);
ok(/Add to Home Screen/.test(html(el)) && !html(el).includes('>Install<'), 'iPhone: Share / Add to Home Screen steps, no fake Install button');
ok(!calls.includes('sw:/sw.js'), 'no service worker outside production');

// 3. computer without a prompt (Firefox / Safari): honest steps
setBrowser({ ua: UA.windows }); el = mount(); el = click(el, /Get the Sahayak app/);
ok(/address bar/.test(html(el)) && /Firefox/.test(html(el)) && !html(el).includes('>Install<'), 'computer without a prompt: address-bar and browser notes');

// 4. already installed: nothing shown
setBrowser({ ua: UA.android, standalone: true }); el = mount(); ok(el === null, 'installed app (standalone): no button');
setBrowser({ ua: UA.iphone, iosStandalone: true }); el = mount(); ok(el === null, 'iPhone home-screen app: no button');
setBrowser({ ua: UA.android }); el = mount(); listeners['appinstalled'][0]({}); el = render(); ok(el === null, 'disappears the moment the app is installed');

// 5. small on test-taking screens, big elsewhere
for (const [p, big] of [['/mock/abc', false], ['/diagnostic', false], ['/baseline', false], ['/dashboard', true], ['/plans', true], ['/', true], ['/admin/control', true], ['/teacher', true]] as const) {
  path = p; setBrowser({ ua: UA.android }); el = mount(); ok(html(el).includes(`data-compact="${big ? 'false' : 'true'}"`), `${p}: ${big ? 'big' : 'small'}`);
}

// 6. "Not now" shrinks it for this tab only, and never fully removes it
path = '/dashboard'; setBrowser({ ua: UA.android }); el = mount(); el = click(el, /Get the Sahayak app/); el = click(el, /Not now/);
ok(html(el).includes('data-compact="true"') && html(el).includes('install-app__button') && session['sahayak_install_snooze'] === '1', 'Not now: small button stays, remembered for this tab only');
setBrowser({ ua: UA.android }); session['sahayak_install_snooze'] = '1'; el = mount(); ok(html(el).includes('data-compact="true"'), 'a snoozed tab stays small after reload');
setBrowser({ ua: UA.android }); el = mount(); ok(html(el).includes('data-compact="false"'), 'a new tab is big again');
setBrowser({ ua: UA.android, sessionBlocked: true }); el = mount(); el = click(el, /Get the Sahayak app/); el = click(el, /Not now/); ok(html(el).includes('install-app__button'), 'blocked storage never breaks the button');

// 7. privacy: nothing is sent anywhere
setBrowser({ ua: UA.android, prod: true }); el = mount(); listeners['beforeinstallprompt'][0](fakeEvt); el = render(); el = click(el, /Get the Sahayak app/); el = click(el, /Close/);
ok(!calls.some((c) => ['fetch', 'beacon', 'localStorage'].includes(c)), 'opening, closing and installing send nothing and store nothing long-term');
ok(!/class="[^"]*feedback-widget/.test(html(el)), 'it does not touch the feedback button');
console.log(`t102b: ${n - f}/${n} passed`); if (f) process.exit(1);
