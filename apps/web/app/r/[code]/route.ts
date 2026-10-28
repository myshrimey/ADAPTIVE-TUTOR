import { NextResponse } from 'next/server';
import { cleanCode, encodeTouch, recordTouch } from '@adaptive-tutor/core';
import { createServiceClient } from '@/lib/supabase-server';
import { anonId } from '@/lib/analytics';

// A shared invite link: /r/ABCD2345. Remembers the code for 30 days (cookie) and sends the visitor to the sign-up page on the home page.
// The code is only attached to an account when that account is created; opening the link alone does nothing.
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = cleanCode(raw);
  const url = new URL('/?invited=1#signup', request.url);
  const res = NextResponse.redirect(url);
  if (code.length === 8) {
    const base = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
    res.cookies.set('sahayak_ref', code, { ...base, maxAge: 60 * 60 * 24 * 30 });
    // v76: opening an invite link is a tracked arrival from "referral" (first touch kept, last touch replaced). The invite code itself is never put in the touch.
    const touch = { source: 'referral', medium: 'invite', campaign: null, content: null, term: null, landing: '/', partner: null, ref: null, at: new Date().toISOString() };
    const v = encodeTouch(touch); const jar = request.headers.get('cookie') ?? '';
    if (!/(?:^|;\s*)sahayak_src=/.test(jar)) res.cookies.set('sahayak_src', v, { ...base, maxAge: 60 * 60 * 24 * 90 });
    res.cookies.set('sahayak_lt', v, { ...base, maxAge: 60 * 60 * 24 * 90 });
    try { const did = /(?:^|;\s*)sahayak_did=([^;]+)/.exec(jar)?.[1]; if (did) await recordTouch(createServiceClient(), anonId(decodeURIComponent(did)), touch); } catch { /* never blocks the redirect */ }
  }
  return res;
}
