// t112: safety headers, smoke test and live-journey checklist exist and say the honest things (v112).
import { readFileSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const cfg = R('apps/web/next.config.js');
for (const h of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy']) ok(cfg.includes(h), `${h} is set`);
ok(/source:\s*'\/:path\*'/.test(cfg) && /if \(!origin\) return \[safety\]/.test(cfg), 'headers apply to every page even when no frontend origin is set');
ok(!/Content-Security-Policy|Strict-Transport-Security/i.test(cfg.replace(/\/\/.*$/gm, '')), 'no CSP / HSTS added without a live trial');
ok(!/camera=\(\)|microphone=\(\)/.test(cfg), 'camera and microphone stay usable by our own pages');
const smoke = R('scripts/smoke/smoke-test.mjs');
ok(!/method:\s*'(PUT|DELETE|PATCH)'/.test(smoke) && !/register|signup/.test(smoke.replace(/'\/api\/auth\/register'/, '').replace(/register refuses/, '')), 'smoke test only reads (no sign-up, no update, no delete)');
const posts = smoke.match(/method: 'POST'/g) ?? [];
ok(posts.length === 2 && /not-an-email/.test(smoke) && /body: '\{\}'/.test(smoke), 'its only two POSTs are deliberately invalid (a bad email, an empty sign-in): nothing is sent or created');
ok(/does not sign in|did not sign in/i.test(smoke) && /No account|creates no account/i.test(smoke), 'smoke test states what it cannot do');
const doc = R('docs/LIVE_JOURNEY_CHECKLIST.md');
ok(/Claude cannot sign in to your live site/.test(doc) && /nothing below has been seen working there/.test(doc), 'checklist is honest that nothing was seen live');
ok(/smoke-test\.mjs/.test(doc) && /forgot password/i.test(doc) && /Too many reset requests/.test(doc), 'checklist covers smoke test and forgot-password limit');
console.log(`t112: ${n - f}/${n} passed`); if (f) process.exit(1);
