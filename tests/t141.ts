// t141: the four reserved activity events are wired (v141): plan changed, permission denied, AI failure, upload failed; no personal data in them.
import { readFileSync } from 'fs';
import { ACTIVITY_TYPES, cleanMeta } from '../packages/core/activity';
(async () => {
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const comm = R('packages/core/commerce/commerce.service.ts');
ok(/type: 'plan_changed'[^)]*via: 'payment'/.test(comm) && /from '\.\.\/activity\/store'/.test(comm), 'a plan activated by a verified payment is recorded');
ok(/type: 'plan_changed'[^)]*via: 'admin'/.test(R('apps/web/app/api/admin/students/[id]/route.ts')), 'a plan changed by an admin is recorded');
const adm = R('apps/web/lib/admin.ts');
ok(/type: 'permission_denied'/.test(adm) && /if \(user\) await recordActivity/.test(adm) && /throw new Error\('not_authorized'\)/.test(adm) && adm.indexOf('permission_denied') < adm.lastIndexOf("throw new Error('not_authorized')"), 'a signed-in person refused by the admin gate is counted (not visitors who are not signed in), and the refusal still happens');
ok(/userId: null, type: 'permission_denied'/.test(adm), 'permission_denied keeps no identity');
const ai = R('apps/web/lib/ai.ts');
ok(/type: 'ai_failure'/.test(ai) && /all_ai_providers_unavailable\|no_ai_providers_configured\|no_vision_provider/.test(ai) && /throw err;/.test(ai) && !/params\.(systemPrompt|userMessage)/.test(ai), 'an AI request that failed on every provider is recorded (feature name only) and still throws');
const sh = R('apps/web/app/api/mock/[id]/sheets/route.ts');
ok((sh.match(/await failed\('/g) ?? []).length === 3 && /type: 'upload_failed'/.test(sh) && !/meta: \{[^}]*(buf|jpeg|file)/.test(sh), 'too-big, not-an-image and poor-quality uploads are recorded with a short reason only');
// meta stays clean for every wired event
const metas = [{ via: 'payment', product: 'founding_family_12m' }, { via: 'admin', plan: 'founding_family' }, { area: 'admin' }, { feature: 'tutor' }, { kind: 'too_big' }];
ok(metas.every((m) => Object.keys(cleanMeta(m)).length === Object.keys(m).length), 'every label used by the wired events passes the meta filter');
ok(['plan_changed', 'permission_denied', 'ai_failure', 'upload_failed'].every((t) => t in ACTIVITY_TYPES), 'the four names exist in the allowed list');
console.log(`t141: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
