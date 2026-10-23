import { NextResponse } from 'next/server';
import { cleanCode } from '@adaptive-tutor/core';

// A shared invite link: /r/ABCD2345. Remembers the code for 30 days (cookie) and sends the visitor to the sign-up page on the home page.
// The code is only attached to an account when that account is created; opening the link alone does nothing.
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = cleanCode(raw);
  const url = new URL('/?invited=1#signup', request.url);
  const res = NextResponse.redirect(url);
  if (code.length === 8) res.cookies.set('sahayak_ref', code, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}
