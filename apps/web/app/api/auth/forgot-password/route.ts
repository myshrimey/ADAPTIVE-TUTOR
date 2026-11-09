import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { RESET_NEUTRAL_TEXT, RESET_BLOCKED_TEXT } from '@adaptive-tutor/core';
import { checkResetAllowed } from '@/lib/password-reset-limit';

// Forgot password, through the server so it is limited per internet address and per email.
// The answer is the same whether or not the account exists. The reason for any failure stays in the server log.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email.includes('@') || email.length > 254) return NextResponse.json({ data: null, error: 'invalid_email' }, { status: 400 });
  let decision: Awaited<ReturnType<typeof checkResetAllowed>> = { allowed: true };
  try { decision = await checkResetAllowed(createServiceClient(), request, email); } catch (err) { console.error('[forgot-password] limit unavailable', err); } // fails open, like the other limits
  if (!decision.allowed) {
    return NextResponse.json({ data: null, error: 'too_many_requests', message: RESET_BLOCKED_TEXT }, { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds) } });
  }
  try {
    const origin = new URL(request.url).origin;
    const supabase = await createServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
    if (error) console.error('[forgot-password]', error.message);
  } catch (err) {
    console.error('[forgot-password]', err);
  }
  return NextResponse.json({ data: { ok: true, message: RESET_NEUTRAL_TEXT }, error: null });
}
