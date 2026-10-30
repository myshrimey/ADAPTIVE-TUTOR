import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin, generatePassword } from '@/lib/admin';

// Admin-only: approve / suspend a teacher, or set a new password. [id] is users.id.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin('academic');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const { data: userRow } = await service.from('users').select('id, auth_user_id, role').eq('id', id).maybeSingle();
    if (!userRow || userRow.role !== 'teacher') return NextResponse.json({ data: null, error: 'teacher_not_found' }, { status: 404 });

    if (body.action === 'approve' || body.action === 'suspend') {
      const status = body.action === 'approve' ? 'approved' : 'suspended';
      const { error } = await service.from('teacher_profiles').update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null }).eq('user_id', id);
      if (error) throw error;
      return NextResponse.json({ data: { status }, error: null });
    }
    if (body.action === 'reset_password') {
      const pw = String(body.password ?? '').trim() || generatePassword();
      if (pw.length < 8) return NextResponse.json({ data: null, error: 'password_too_short' }, { status: 400 });
      const { error } = await service.auth.admin.updateUserById(userRow.auth_user_id, { password: pw });
      if (error) throw error;
      return NextResponse.json({ data: { password: pw }, error: null });
    }
    return NextResponse.json({ data: null, error: 'invalid_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
