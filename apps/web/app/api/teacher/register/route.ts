import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { attachReferralFromCookie } from '@/lib/referral';
import { captureSignupFromCookies } from '@/lib/acquisition';

// Public: a teacher registers with their own credentials. The account is created PENDING
// and gets no review tools until the founder approves it at /admin/teachers. This runs on
// the server (service key) because public self sign-up in Supabase is switched off during
// early access. Basic abuse guard: a hidden honeypot field, field limits, and approval.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.website) return NextResponse.json({ data: { registered: true }, error: null }); // honeypot: pretend success to bots
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim().slice(0, 120);
    const qualification = String(body.qualification ?? '').trim().slice(0, 300) || null;
    const school = String(body.school ?? '').trim().slice(0, 200) || null;
    const subjects = String(body.subjects ?? '').trim().slice(0, 200) || null;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ data: null, error: 'invalid_email' }, { status: 400 });
    if (!displayName) return NextResponse.json({ data: null, error: 'missing_name' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ data: null, error: 'password_too_short' }, { status: 400 });

    const service = createServiceClient();
    const { data: created, error: cErr } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (cErr || !created?.user) {
      const msg = cErr?.message ?? 'create_failed';
      return NextResponse.json({ data: null, error: /already|exists|registered/i.test(msg) ? 'email_already_registered' : 'registration_failed' }, { status: 400 });
    }
    try {
      const { data: userRow, error: uErr } = await service.from('users').upsert({ auth_user_id: created.user.id, email, role: 'teacher' }, { onConflict: 'auth_user_id' }).select('id').single();
      if (uErr || !userRow) throw uErr ?? new Error('user_row_failed');
      const { error: tErr } = await service.from('teacher_profiles').insert({ user_id: userRow.id, display_name: displayName, qualification, school, subjects, status: 'pending' });
      if (tErr) throw tErr;
      await attachReferralFromCookie(service, userRow.id, 'teacher');
      await captureSignupFromCookies(service, userRow.id, 'teacher');
    } catch (inner) {
      await service.auth.admin.deleteUser(created.user.id);
      throw inner;
    }
    return NextResponse.json({ data: { registered: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
