// v142 (TASK-060): pure helpers for the live API boundary check. No network here (tests import this file).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DUMMY_ID = '00000000-0000-0000-0000-000000000000';
export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Routes that are meant to answer people who are not signed in. Everything else is treated as private. */
export const PUBLIC_PREFIXES = ['/api/activity/logout', '/api/auth/', '/api/public/', '/api/me', '/api/track', '/api/invite/', '/api/commerce/plans', '/api/feature'];
export const isPublicPath = (p) => PUBLIC_PREFIXES.some((x) => p === x || p.startsWith(x));
/** A signed-in student must never get anything from these. */
export const ROLE_ONLY_PREFIXES = ['/api/admin/', '/api/teacher/', '/api/centre', '/api/portal/'];
export const isRoleOnlyPath = (p) => ROLE_ONLY_PREFIXES.some((x) => p === x.replace(/\/$/, '') || p.startsWith(x));

export function walkRoutes(root) {
  const out = [];
  const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (e === 'route.ts') out.push(p); } };
  walk(root);
  return out;
}
/** apps/web/app/api/mock/[id]/sheets/route.ts -> /api/mock/<dummy>/sheets */
export function routeToPath(file, apiRoot) {
  const rel = file.slice(apiRoot.length).replace(/\\/g, '/').replace(/\/route\.ts$/, '');
  return '/api' + rel.replace(/\[\.\.\.[^\]]+\]/g, 'x').replace(/\[[^\]]+\]/g, DUMMY_ID);
}
export function methodsOf(src) {
  const found = new Set();
  for (const m of METHODS) if (new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${m}\\b`).test(src)) found.add(m);
  return [...found];
}
export function collectRoutes(apiRoot) {
  return walkRoutes(apiRoot).map((file) => ({ file, path: routeToPath(file, apiRoot), methods: methodsOf(readFileSync(file, 'utf8')) })).sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Judges one answer. Result: PASS, REVIEW (a person should look) or FAIL.
 * `who` says what the caller had: 'none' | 'forged' | 'student'.
 */
export function judge({ path, method, status, body, who }) {
  if (!status) return { v: 'FAIL', why: 'no answer from the site' };
  if (status >= 500) return { v: 'FAIL', why: `server error ${status}` };
  if (status >= 300 && status < 400) return { v: 'PASS', why: `redirect ${status}` };
  if (status >= 400) return { v: 'PASS', why: `refused ${status}` };
  // 2xx from here
  let j = null; try { j = JSON.parse(body); } catch { /* not json */ }
  const hasData = j && j.data !== null && j.data !== undefined && !(typeof j.data === 'object' && Object.keys(j.data).length === 0);
  const refused = j && (j.error || !hasData);
  if (path.startsWith('/api/me')) return /"email"|"role"\s*:\s*"(admin|student|parent|teacher|tutor|centre)"/.test(body || '') ? { v: 'FAIL', why: 'the answer shows a person to a caller who is not signed in' } : { v: 'PASS', why: 'no person in the answer' };
  if (refused) return { v: 'PASS', why: 'answered with no data' };
  const roleOnly = isRoleOnlyPath(path);
  if (who !== 'student' && isPublicPath(path)) return { v: 'PASS', why: 'public route' };
  if (roleOnly || who === 'student') return { v: 'FAIL', why: `${who === 'student' ? 'a student' : 'a signed-out caller'} got data from a role-only route (${method})` };
  return { v: 'REVIEW', why: `answered ${method} with data and no sign-in; confirm this route is meant to be public` };
}

/** A harmless request: reads for GET; for everything else an invalid body so nothing can be created or changed. */
export function requestFor(method) {
  return method === 'GET' ? {} : { method, headers: { 'content-type': 'application/json' }, body: 'not json' };
}
export const FORGED_HEADERS = { cookie: 'sb-access-token=forged.invalid.token; sb-refresh-token=forged', authorization: 'Bearer forged.invalid.token' };
