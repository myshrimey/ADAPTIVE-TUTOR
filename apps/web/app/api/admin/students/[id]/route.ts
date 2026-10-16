import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin, generatePassword } from '@/lib/admin';
import { ACCESS_PLAN_CODES, validateAccessUntil, type AccessPlanCode } from '@adaptive-tutor/core';

// Admin-only: change a student's plan / subject limit / end date, or set a new password.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const service = createServiceClient();

    if (body.action === 'reset_password') {
      const newPassword = String(body.password ?? '').trim() || generatePassword();
      if (newPassword.length < 8) return NextResponse.json({ data: null, error: 'password_too_short' }, { status: 400 });
      const { data: st } = await service.from('students').select('users(auth_user_id)').eq('id', id).single();
      const authId = (st as any)?.users?.auth_user_id;
      if (!authId) return NextResponse.json({ data: null, error: 'student_not_found' }, { status: 404 });
      const { error } = await service.auth.admin.updateUserById(authId, { password: newPassword });
      if (error) throw error;
      return NextResponse.json({ data: { password: newPassword }, error: null });
    }

    const planCode = body.planCode as AccessPlanCode;
    const subjectLimit = Number(body.subjectLimit);
    const accessUntil: string | null = body.accessUntil ? String(body.accessUntil) : null;
    if (!ACCESS_PLAN_CODES.includes(planCode)) return NextResponse.json({ data: null, error: 'invalid_plan' }, { status: 400 });
    if (!Number.isInteger(subjectLimit) || subjectLimit < 1 || subjectLimit > 10) return NextResponse.json({ data: null, error: 'invalid_subject_limit' }, { status: 400 });
    const dateErr = validateAccessUntil(planCode, accessUntil);
    if (dateErr) return NextResponse.json({ data: null, error: dateErr }, { status: 400 });

    const { data: exists } = await service.from('students').select('id').eq('id', id).maybeSingle();
    if (!exists) return NextResponse.json({ data: null, error: 'student_not_found' }, { status: 404 });
    const { error } = await service.from('student_access').upsert(
      { student_id: id, plan_code: planCode, subject_limit: subjectLimit, access_until: accessUntil, notes: body.notes ? String(body.notes).slice(0, 500) : null, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' }
    );
    if (error) throw error;
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
