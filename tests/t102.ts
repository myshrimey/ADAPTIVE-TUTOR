// t102: "Get the app" button: rules, manifest, service worker, wiring, privacy (v102).
import { readFileSync } from 'fs';
import { detectPlatform, installMode, installAdvice, isCompactRoute, isIosSafari, COMPACT_ROUTES } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

// ---- device detection
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
  ipadAsMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
};
ok(detectPlatform(UA.iphone) === 'ios' && detectPlatform(UA.iphoneChrome) === 'ios', 'iPhone is ios');
ok(detectPlatform(UA.ipadAsMac, 5) === 'ios' && detectPlatform(UA.mac, 0) === 'desktop', 'iPad posing as a Mac is ios; a real Mac is desktop');
ok(detectPlatform(UA.android) === 'android' && detectPlatform(UA.windows) === 'desktop' && detectPlatform('') === 'desktop' && detectPlatform(undefined as any) === 'desktop', 'android, windows, empty');
ok(isIosSafari(UA.iphone) && !isIosSafari(UA.iphoneChrome), 'Safari vs Chrome on iPhone');
ok(installMode({ standalone: true, hasPrompt: true }) === 'installed' && installMode({ standalone: false, hasPrompt: true }) === 'prompt' && installMode({ standalone: false, hasPrompt: false }) === 'steps', 'modes');

// ---- advice by device
const ios = installAdvice('ios', 'steps', true), iosC = installAdvice('ios', 'steps', false), and = installAdvice('android', 'prompt'), andS = installAdvice('android', 'steps'), dk = installAdvice('desktop', 'steps'), dkP = installAdvice('desktop', 'prompt');
ok(/Add to Home Screen/.test(ios.steps.join(' ')) && /Share/.test(ios.steps.join(' ')), 'iPhone: Share, then Add to Home Screen');
ok(/Safari/.test(iosC.steps[0]), 'iPhone in another browser: told to open Safari');
ok(/Install/.test(and.steps[0]) && /three dots/.test(andS.steps[0]), 'Android: prompt wording vs menu wording');
ok(/address bar/.test(dk.steps[0]) && /Firefox/.test(dk.steps.join(' ')) && /Install/.test(dkP.steps[0]), 'computer: address-bar icon, Safari/Firefox honesty');
for (const a of [ios, iosC, and, andS, dk, dkP]) ok(/not in the Play Store or App Store/.test(a.note) && a.button === 'Get the app' && a.steps.length >= 2, 'every advice says it is not in a store and has steps');
ok(!/download the apk|play store link|app store link/i.test(JSON.stringify([ios, and, dk])), 'no claim of a store app');

// ---- compact on test-taking screens, big elsewhere
for (const p of ['/diagnostic', '/diagnostic/x', '/baseline', '/baseline/path', '/mock/abc', '/stretch', '/challenge', '/battle', '/review']) ok(isCompactRoute(p), `compact on ${p}`);
for (const p of ['/', '/dashboard', '/plans', '/learn', '/parent', '/admin', '/mock', '/diagnosticx', '/reports']) ok(!isCompactRoute(p), `large on ${p}`);
ok(COMPACT_ROUTES.length >= 7 && !isCompactRoute('') && !isCompactRoute(undefined as any), 'odd input is not compact');

// ---- manifest + service worker + wiring
const mf = R('apps/web/app/manifest.ts');
ok(/display:\s*'standalone'/.test(mf) && /start_url:\s*'\/'/.test(mf) && /icon-192\.png/.test(mf) && /icon-512\.png/.test(mf) && /short_name:\s*'Sahayak'/.test(mf) && /theme_color/.test(mf) && /background_color/.test(mf), 'manifest has what browsers need');
const sw = R('apps/web/public/sw.js').replace(/\/\/.*$/gm, '');
ok(/addEventListener\('fetch'/.test(sw) && !/respondWith|caches\.|cache\.|\.put\(|\.addAll\(|indexedDB|localStorage/.test(sw), 'service worker only passes requests through: it never caches or answers anything');
const lay = R('apps/web/app/layout.tsx');
ok(/<InstallApp \/>/.test(lay) && /import \{ InstallApp \}/.test(lay) && lay.indexOf('<InstallApp />') > lay.indexOf('{children}'), 'mounted once in the page layout (every page)');
ok(/themeColor/.test(lay) && /appleWebApp/.test(lay), 'phone colours and iPhone app title set');
const mw = R('apps/web/middleware.ts');
ok(/sw\.js/.test(mw) && /manifest\.webmanifest/.test(mw) && /supabase\.auth\.getUser\(\)/.test(mw), 'sign-in refresh still runs for pages; the two install files skip it');

// ---- privacy: nothing recorded
const c = R('apps/web/components/InstallApp.tsx');
ok(!/fetch\(|sendBeacon|XMLHttpRequest|localStorage|document\.cookie|\/api\//.test(c), 'the button sends nothing to the server and writes no cookies or long-term storage');
ok(/sessionStorage/.test(c) && /try \{[^}]*sessionStorage/.test(c), 'only a per-tab "Not now" note, wrapped in try/catch');
ok(/@media print \{ \.install-app \{ display: none/.test(R('apps/web/app/globals.css')), 'hidden when printing (papers and reports)');
ok(/prefers-reduced-motion/.test(R('apps/web/app/globals.css').split('install the app (v102)')[1] ?? ''), 'the pulse respects reduced-motion');
ok(/aria-label="Get the Sahayak app/.test(c) && /aria-expanded/.test(c) && /role="dialog"/.test(c), 'accessible name, state and dialog role');
ok(/min-height: 48px/.test(R('apps/web/app/globals.css')), 'tap target at least 48 px');
console.log(`t102: ${n - f}/${n} passed`); if (f) process.exit(1);
