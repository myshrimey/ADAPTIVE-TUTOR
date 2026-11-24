// v145 (TASK-062): pure helpers for the page-journey check. No network here.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const ROLES = ['student', 'parent', 'tutor', 'centre', 'teacher', 'admin'];
export const DUMMY = '00000000-0000-0000-0000-000000000000';
const ADULT_AREAS = ['parent', 'tutor', 'centre', 'teacher'];
// Pages a signed-in student uses. Everything else outside the role areas is treated as public.
export const STUDENT_PREFIXES = ['/dashboard', '/learn', '/profile', '/progress', '/report', '/reports', '/today', '/subjects', '/diagnostic', '/baseline', '/mock', '/review', '/mistakes', '/my-data', '/my-feedback', '/sharing', '/onboarding', '/challenge', '/stretch', '/battle', '/friend', '/leaderboard', '/achievements', '/written', '/board-readiness', '/board-programme', '/exam-rescue', '/plan', '/journey'];

export function walkPages(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    if (statSync(p).isDirectory()) { if (name === 'api') continue; out.push(...walkPages(p)); } else if (name === 'page.tsx') out.push(p);
  }
  return out;
}
export function pageToPath(file, appRoot) {
  let rel = file.replace(appRoot, '').replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
  rel = rel.split('/').filter((s) => !/^\(.*\)$/.test(s)).map((s) => (/^\[.*\]$/.test(s) ? DUMMY : s)).join('/');
  return rel === '' ? '/' : rel;
}
const first = (p) => '/' + p.split('/')[1];
/** admin | student | parent | tutor | centre | teacher | public */
export function classifyPage(path) {
  const a = first(path).slice(1);
  if (a === 'admin') return 'admin';
  if (ADULT_AREAS.includes(a)) return /^\/[a-z]+\/(login|register)(\/|$)/.test(path) || path === `/${a}/login` ? 'public' : a;
  if (STUDENT_PREFIXES.some((x) => path === x || path.startsWith(x + '/'))) return 'student';
  return 'public';
}
export const isDynamic = (path) => path.includes(DUMMY);
export function collectPages(appRoot) {
  return walkPages(appRoot).map((f) => pageToPath(f, appRoot)).map((path) => ({ path, kind: classifyPage(path), dynamic: isDynamic(path) })).sort((a, b) => a.path.localeCompare(b.path));
}
// A page that asks the visitor to sign in has a sign-in HEADING (the site header always has a sign-in link, so a plain word match proves nothing).
export const asksToSignIn = (body) => /Admin sign in/i.test(body) || /<h1[^>]*>[^<]*(sign in|log in|sign-in)[^<]*<\/h1>/i.test(body);

/** who = 'none' | 'forged' | a role name (the cookie given for that role). Returns { v: PASS|REVIEW|FAIL, why }. */
export function judgePage({ kind, status, body = '', who, dynamic = false }) {
  if (!status) return { v: 'FAIL', why: 'no answer' };
  if (status >= 500) return { v: 'FAIL', why: `server error ${status}` };
  const redirect = status >= 300 && status < 400;
  const refused = status === 401 || status === 403 || status === 404;
  if (who === 'none' || who === 'forged') {
    if (kind === 'public' && dynamic && (status === 404 || redirect)) return { v: 'PASS', why: '' }; // a made-up id has nothing to show
    if (kind === 'public') return status === 200 ? { v: 'PASS', why: '' } : { v: 'REVIEW', why: `public page answered ${status}: broken link, or is it meant to be private?` };
    if (redirect || refused) return { v: 'PASS', why: '' };
    if (status === 200 && asksToSignIn(body)) return { v: 'PASS', why: '' };
    return kind === 'admin' ? { v: 'FAIL', why: 'admin page shown to a signed-out visitor' } : { v: 'REVIEW', why: 'private page answered 200 without a sign-in heading: is it showing content to a visitor?' };
  }
  // signed in with the cookie of role `who`
  if (kind === 'public') return { v: 'PASS', why: '' };
  if (kind === who) {
    if (status === 200 && !asksToSignIn(body)) return { v: 'PASS', why: '' };
    if (status === 200) return { v: 'REVIEW', why: 'own page shows a sign-in prompt: has the cookie expired?' };
    return { v: 'REVIEW', why: `own page answered ${status}: can this account type open its own page?` };
  }
  // another account type's area
  if (redirect || refused) return { v: 'PASS', why: '' };
  if (status === 200 && asksToSignIn(body)) return { v: 'PASS', why: '' };
  return kind === 'admin' ? { v: 'FAIL', why: `admin page shown to a ${who} account` } : { v: 'REVIEW', why: `${kind} page answered 200 to a ${who} account: does it refuse, or show someone else's content?` };
}
/** Which pages a cookie of `role` is tried against: its own area (not dynamic) and every other adult/admin area. */
export function pagesFor(role, pages) {
  return pages.filter((p) => p.kind !== 'public' && (p.kind === role ? !p.dynamic : p.kind === 'admin' || ADULT_AREAS.includes(p.kind)));
}
