// t98: visitors never see raw server error text (v98).
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { publicError } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const origErr = console.error; const logged: string[] = []; console.error = (...a: any[]) => { logged.push(a.join(' ')); };

// our own short codes pass through (screens map them to friendly text)
for (const c of ['unauthenticated', 'subject_not_allowed', 'not_authorized', 'missing_required_fields', 'bad_region'])
  ok(publicError(new Error(c)) === c, `code passes through: ${c}`);
ok(logged.length === 0, 'a plain code is not logged as a hidden error');
// anything else is hidden and logged on the server only
const raw = ['duplicate key value violates unique constraint "idx_users_username_unique"', 'new row for relation "students" violates check constraint', 'JWT expired', 'fetch failed', 'column "x" does not exist', 'Invalid API key', 'relation "public.secret_table" does not exist', '42P01', 'PGRST116', ''];
for (const m of raw) { const out = publicError(new Error(m)); ok(out === 'unknown_error' && !out.includes('constraint') && !out.includes('relation'), `hidden: ${m.slice(0, 40)}`); }
ok(logged.length === raw.length && logged.every((l) => /hidden from visitor/.test(l)), 'every hidden message is logged on the server');
ok(publicError(new Error('boom boom'), 'error') === 'error', 'fallback is used');
ok(publicError(undefined) === 'unknown_error' && publicError(null) === 'unknown_error' && publicError({}) === 'unknown_error' && publicError(42 as any) === 'unknown_error', 'odd values never crash or leak');
ok(publicError('not_authorized') === 'not_authorized', 'a plain string code also passes');
ok(publicError(new Error('x'.repeat(5000))) === 'unknown_error' && logged[logged.length - 1].length < 400, 'long messages are cut in the log');
console.error = origErr;

// every non-admin route that answers a failure uses it
const API = 'apps/web/app/api';
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? walk(p) : p.endsWith('route.ts') ? [p] : []; });
const routes = walk(API).filter((p) => !p.startsWith(API + '/admin/'));
let using = 0;
for (const p of routes) {
  const s = readFileSync(p, 'utf8');
  if (/publicError\(/.test(s)) { using++; ok(/import \{[^}]*\bpublicError\b[^}]*\} from '@adaptive-tutor\/core'/.test(s), `${p}: imports publicError`); }
  ok(!/error:\s*\(?\s*(err|e)(\.|\?\.)message(?!\s*===)/.test(s), `${p}: no raw message echoed`);
}
ok(using >= 55, `publicError is used in ${using} routes`);
console.log(`t98: ${n - f}/${n} passed`); if (f) process.exit(1);
