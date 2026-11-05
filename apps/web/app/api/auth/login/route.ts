import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { normaliseUsername, placeholderEmail } from '@adaptive-tutor/core';
import { checkLoginAllowed, recordLoginFailure, clearLoginFailures } from '@/lib/login-throttle';

// Sign in with a USERNAME or an email. The username is turned into the login address on the server only,
// so a real email is never revealed to the browser. Wrong username and wrong password give the same message.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier ?? '').trim();
    const password = String(body.password ?? '');
    if (!identifier || !password) return NextResponse.json({ data: null, error: 'invalid_login' }, { status: 400 });

    // v96: too many wrong passwords for this account (or from this internet address) in a short time = wait.
    // Checked BEFORE the password is tried, so a guesser gets no answer at all while blocked.
    const throttle = createServiceClient();
    const decision = await checkLoginAllowed(throttle, identifier, request);
    if (!decision.allowed) {
      return NextResponse.json({ data: null, error: 'too_many_attempts' }, { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds) } });
    }

    let loginEmail = identifier.toLowerCase();
    if (!identifier.includes('@')) {
      const username = normaliseUsername(identifier);
      const service = throttle;
      const { data: row } = await service.from('users').select('email').eq('username', username).maybeSingle();
      loginEmail = row?.email ?? placeholderEmail(username); // unknown name: try a placeholder so timing and message match
    }
    const supabase = await createServerClient(); // writes the session cookie on success
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      await recordLoginFailure(throttle, identifier, request); // only the WRONG attempt, as hashes
      return NextResponse.json({ data: null, error: 'invalid_login' }, { status: 401 });
    }
    await clearLoginFailures(throttle, identifier);

    // Each kind of account has its own sign-in page. If the page says which one it is (portal) and this account
    // belongs elsewhere, sign out again and say where to go. Admin emails may use any page.
    const portal = typeof body.portal === 'string' ? body.portal : null;
    const { data: authData } = await supabase.auth.getUser();
    const service2 = createServiceClient();
    const { data: row } = await service2.from('users').select('role').eq('auth_user_id', authData.user?.id ?? '').maybeSingle();
    const role = row?.role ?? 'none';
    const adminList = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isAdmin = !!authData.user?.email && adminList.includes(authData.user.email.toLowerCase());
    if (portal && !isAdmin && role !== portal) {
      await supabase.auth.signOut();
      return NextResponse.json({ data: { role }, error: 'wrong_portal' }, { status: 403 });
    }
    return NextResponse.json({ data: { ok: true, role }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: 'login_failed' }, { status: 500 });
  }
}
