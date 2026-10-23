import { cookies, headers } from 'next/headers';
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { attachReferral } from '@adaptive-tutor/core';

/** Attach the invite link the new person arrived with (cookie set by /r/CODE) to their new account. Never throws. */
export async function attachReferralFromCookie(service: SupabaseClient, referredUserId: string, referredRole: string): Promise<void> {
  try {
    const code = (await cookies()).get('sahayak_ref')?.value;
    if (!code) return;
    const fwd = (await headers()).get('x-forwarded-for') ?? '';
    const ipHash = createHash('sha256').update('sahayak-ref:' + (fwd.split(',')[0].trim() || 'unknown')).digest('hex');
    await attachReferral(service, { code, referredUserId, referredRole, ipHash });
  } catch { /* a referral problem never stops a sign-up */ }
}
