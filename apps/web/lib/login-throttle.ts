import { createHash } from 'crypto';
import { decideLogin, normaliseLoginKey, LOGIN_WINDOW_MINUTES, LOGIN_KEEP_HOURS, type LoginDecision } from '@adaptive-tutor/core';

const h = (salt: string, v: string) => createHash('sha256').update(salt + v).digest('hex');
export const keyHash = (identifier: string) => h('sahayak-login-key:', normaliseLoginKey(identifier));
export function ipHashOf(request: Request): string {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return h('sahayak-login-ip:', ip);
}

/** Look before trying the password. A database problem NEVER locks anyone out (fails open, e.g. before migration 0058). */
export async function checkLoginAllowed(service: any, identifier: string, request: Request): Promise<LoginDecision> {
  try {
    const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000).toISOString();
    const [a, i] = await Promise.all([
      service.from('login_attempts').select('id', { count: 'exact', head: true }).eq('key_hash', keyHash(identifier)).gte('created_at', since),
      service.from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHashOf(request)).gte('created_at', since),
    ]);
    if (a.error || i.error) return { allowed: true };
    return decideLogin(a.count ?? 0, i.count ?? 0);
  } catch { return { allowed: true }; }
}

/** Remember one WRONG password (hashes only) and forget old rows. Never throws. */
export async function recordLoginFailure(service: any, identifier: string, request: Request): Promise<void> {
  try {
    await service.from('login_attempts').insert({ key_hash: keyHash(identifier), ip_hash: ipHashOf(request) });
    await service.from('login_attempts').delete().lt('created_at', new Date(Date.now() - LOGIN_KEEP_HOURS * 3600_000).toISOString());
  } catch { /* best effort */ }
}

/** A correct sign-in clears that account's failures so a real owner is not punished for earlier typos. Never throws. */
export async function clearLoginFailures(service: any, identifier: string): Promise<void> {
  try { await service.from('login_attempts').delete().eq('key_hash', keyHash(identifier)); } catch { /* best effort */ }
}
