import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { captureSignupAttribution, decodeTouch, cleanSource } from '@adaptive-tutor/core';
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

/** v79: an account made from an invitation. The invitation itself is the first touch (source, campaign, referral) and is stored server-side; nothing the browser sends can change it. */
export async function captureInviteSignup(service: SupabaseClient, userId: string, role: string, inv: { source: string | null; campaign: string | null; referral_code: string | null }): Promise<void> {
  try {
    const at = new Date().toISOString();
    const t = { source: cleanSource(inv.source ?? 'invitation'), medium: 'invitation', campaign: inv.campaign, content: null, term: null, landing: '/invite', partner: null, ref: inv.referral_code, at };
    await captureSignupAttribution(service, { userId, role, anon: null, first: t, last: t, referralCode: inv.referral_code });
  } catch { /* never blocks a sign-up */ }
}
