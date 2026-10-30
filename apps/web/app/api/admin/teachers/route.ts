import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin, generatePassword } from '@/lib/admin';

// Admin-only: create an (already approved) teacher account with an email + password the
// founder passes on. Shown once, never stored.
export async function POST(request: Request) {
  try {
    await requireAdmin('academic');
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const displayName = String(body.displayName ?? '').trim().slice(0, 120);
    const password = String(body.password ?? '').trim() || generatePassword();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ data: null, error: 'invalid_email' }, { status: 400 });
    if (!displayName) return NextResponse.json({ data: null, error: 'missing_name' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ data: null, error: 'password_too_short' }, { status: 400 });

    const service = createServiceClient();
    const { data: created, error: cErr } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (cErr || !created?.user) {
      const msg = cErr?.message ?? 'create_failed';
      return NextResponse.json({ data: null, error: /already|exists|registered/i.test(msg) ? 'email_already_registered' : msg }, { status: 400 });
    }
    try {
      const { data: userRow, error: uErr } = await service.from('users').upsert({ auth_user_id: created.user.id, email, role: 'teacher' }, { onConflict: 'auth_user_id' }).select('id').single();
      if (uErr || !userRow) throw uErr ?? new Error('user_row_failed');
      const { error: tErr } = await service.from('teacher_profiles').insert({ user_id: userRow.id, display_name: displayName, status: 'approved', approved_at: new Date().toISOString() });
      if (tErr) throw tErr;
    } catch (inner) {
      await service.auth.admin.deleteUser(created.user.id);
      throw inner;
    }
    return NextResponse.json({ data: { email, password }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
