import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin, generatePassword } from '@/lib/admin';
import { ACCESS_PLAN_CODES, validateAccessUntil, type AccessPlanCode } from '@adaptive-tutor/core';

// Admin-only: create a student account (email + password), give it a plan, and mark it so
// the student completes their profile on first sign-in. The password is returned ONCE in
// this response so the founder can pass it on; it is never stored or logged by Sahayak.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const displayName = String(body.displayName ?? '').trim();
    const planCode = body.planCode as AccessPlanCode;
    const subjectLimit = Number(body.subjectLimit);
    const accessUntil: string | null = body.accessUntil ? String(body.accessUntil) : null;
    const password = String(body.password ?? '').trim() || generatePassword();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ data: null, error: 'invalid_email' }, { status: 400 });
    if (!displayName) return NextResponse.json({ data: null, error: 'missing_name' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ data: null, error: 'password_too_short' }, { status: 400 });
    if (!ACCESS_PLAN_CODES.includes(planCode)) return NextResponse.json({ data: null, error: 'invalid_plan' }, { status: 400 });
    if (!Number.isInteger(subjectLimit) || subjectLimit < 1 || subjectLimit > 10) return NextResponse.json({ data: null, error: 'invalid_subject_limit' }, { status: 400 });
    const dateErr = validateAccessUntil(planCode, accessUntil);
    if (dateErr) return NextResponse.json({ data: null, error: dateErr }, { status: 400 });

    const service = createServiceClient();
    const { data: created, error: createErr } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'create_failed';
      return NextResponse.json({ data: null, error: /already|exists|registered/i.test(msg) ? 'email_already_registered' : msg }, { status: 400 });
    }
    const authId = created.user.id;

    try {
      const { data: userRow, error: uErr } = await service.from('users').upsert({ auth_user_id: authId, email, role: 'student' }, { onConflict: 'auth_user_id' }).select('id').single();
      if (uErr || !userRow) throw uErr ?? new Error('user_row_failed');
      const { data: st, error: sErr } = await service
        .from('students')
        .insert({ user_id: userRow.id, display_name: displayName, grade: 'CBSE-10', must_complete_profile: true })
        .select('id')
        .single();
      if (sErr || !st) throw sErr ?? new Error('student_row_failed');
      const { error: aErr } = await service.from('student_access').insert({ student_id: st.id, plan_code: planCode, subject_limit: subjectLimit, access_until: accessUntil, notes: body.notes ? String(body.notes).slice(0, 500) : null });
      if (aErr) throw aErr;
      return NextResponse.json({ data: { studentId: st.id, email, password }, error: null });
    } catch (inner: any) {
      // Roll back the half-created login so the founder can simply try again.
      await service.auth.admin.deleteUser(authId);
      throw inner;
    }
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
