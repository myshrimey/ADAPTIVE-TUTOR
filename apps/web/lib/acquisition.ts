import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { captureSignupAttribution, decodeTouch } from '@adaptive-tutor/core';
import { anonId } from '@/lib/analytics';

/** v76: record where a new account came from (first touch, last touch, partner, post), from the cookies set when they arrived through a link.
 *  Also matches earlier tracked arrivals of the same browser to this account. Never throws: attribution must never stop a sign-up. */
export async function captureSignupFromCookies(service: SupabaseClient, userId: string, role: string): Promise<void> {
  try {
    const c = await cookies(); const did = c.get('sahayak_did')?.value;
    const first = decodeTouch(c.get('sahayak_src')?.value); const last = decodeTouch(c.get('sahayak_lt')?.value) ?? first;
    await captureSignupAttribution(service, { userId, role, anon: did ? anonId(did) : null, first, last });
  } catch { /* never blocks a sign-up */ }
}
