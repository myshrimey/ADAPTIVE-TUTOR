import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { normaliseUsername, placeholderEmail } from '@adaptive-tutor/core';

// Sign in with a USERNAME or an email. The username is turned into the login address on the server only,
// so a real email is never revealed to the browser. Wrong username and wrong password give the same message.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier ?? '').trim();
    const password = String(body.password ?? '');
    if (!identifier || !password) return NextResponse.json({ data: null, error: 'invalid_login' }, { status: 400 });

    let loginEmail = identifier.toLowerCase();
    if (!identifier.includes('@')) {
      const username = normaliseUsername(identifier);
      const service = createServiceClient();
      const { data: row } = await service.from('users').select('email').eq('username', username).maybeSingle();
      loginEmail = row?.email ?? placeholderEmail(username); // unknown name: try a placeholder so timing and message match
    }
    const supabase = await createServerClient(); // writes the session cookie on success
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) return NextResponse.json({ data: null, error: 'invalid_login' }, { status: 401 });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: 'login_failed' }, { status: 500 });
  }
}
