import { createHash } from 'crypto';
import { decideResetRequest, RESET_WINDOW_MINUTES, type ResetDecision } from '@adaptive-tutor/core';

const h = (kind: string, v: string) => createHash('sha256').update(`sahayak-reset-${kind}:` + v).digest('hex');

/** Count recent reset requests for this address and this email, then record this one. Only hashes are stored. A database problem never blocks anyone (fails open). */
export async function checkResetAllowed(service: any, request: Request, email: string): Promise<ResetDecision> {
  try {
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ipH = h('ip', ip), mailH = h('mail', email.trim().toLowerCase());
    const since = new Date(Date.now() - RESET_WINDOW_MINUTES * 60_000).toISOString();
    const count = async (x: string) => {
      const { count: c, error } = await service.from('public_check_log').select('id', { count: 'exact', head: true }).eq('ip_hash', x).gte('created_at', since);
      return error ? 0 : (c ?? 0);
    };
    const d = decideResetRequest(await count(ipH), await count(mailH));
    if (d.allowed) await service.from('public_check_log').insert([{ ip_hash: ipH }, { ip_hash: mailH }]);
    return d;
  } catch { return { allowed: true }; }
}
