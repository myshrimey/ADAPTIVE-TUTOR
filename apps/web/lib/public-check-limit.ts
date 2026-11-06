import { createHash } from 'crypto';
import { decidePublicCheck, PUBLIC_CHECK_WINDOW_MINUTES, PUBLIC_CHECK_KEEP_HOURS, type PublicCheckDecision } from '@adaptive-tutor/core';

export function checkIpHash(request: Request): string {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return createHash('sha256').update('sahayak-public-check:' + ip).digest('hex');
}

/** Count this address's recent requests, then record this one. A database problem NEVER blocks anyone (fails open, e.g. before migration 0060). */
export async function checkPublicCheckAllowed(service: any, request: Request): Promise<PublicCheckDecision> {
  try {
    const ip = checkIpHash(request);
    const since = new Date(Date.now() - PUBLIC_CHECK_WINDOW_MINUTES * 60_000).toISOString();
    const { count, error } = await service.from('public_check_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ip).gte('created_at', since);
    if (error) return { allowed: true };
    const d = decidePublicCheck(count ?? 0);
    if (d.allowed) {
      await service.from('public_check_log').insert({ ip_hash: ip });
      await service.from('public_check_log').delete().lt('created_at', new Date(Date.now() - PUBLIC_CHECK_KEEP_HOURS * 3600_000).toISOString());
    }
    return d;
  } catch { return { allowed: true }; }
}
