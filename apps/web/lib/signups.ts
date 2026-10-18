import { DEFAULT_DAILY_SIGNUP_CAP } from '@adaptive-tutor/core';

/** Self sign-up is open unless the founder sets SIGNUPS_CLOSED=true in Vercel. (The old SIGNUPS_OPEN setting is ignored on purpose.) */
export function signupsOpen(): boolean {
  return process.env.SIGNUPS_CLOSED !== 'true';
}

export function dailySignupCap(): number {
  const n = Number(process.env.SIGNUP_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_SIGNUP_CAP;
}

import { createHash } from 'crypto';
import { SIGNUPS_PER_IP_PER_HOUR } from '@adaptive-tutor/core';

/** Shared abuse limits for public sign-ups: per internet address per hour and a daily total. Returns an error code or null (and records this attempt). */
export async function checkSignupLimits(service: any, request: Request): Promise<'too_many_attempts' | 'daily_cap_reached' | null> {
  const fwd = request.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update('sahayak-signup:' + ip).digest('hex');
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  await service.from('signup_log').delete().lt('created_at', new Date(Date.now() - 2 * 86400_000).toISOString());
  const [{ count: ipCount, error: e1 }, { count: dayCount, error: e2 }] = await Promise.all([
    service.from('signup_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', hourAgo),
    service.from('signup_log').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
  ]);
  if (e1 || e2) throw e1 ?? e2;
  if ((ipCount ?? 0) >= SIGNUPS_PER_IP_PER_HOUR) return 'too_many_attempts';
  if ((dayCount ?? 0) >= dailySignupCap()) return 'daily_cap_reached';
  await service.from('signup_log').insert({ ip_hash: ipHash });
  return null;
}
