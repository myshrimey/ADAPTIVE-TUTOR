import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';

// Founder-only. Permanently deletes one student's learning data and sign-in account for a request a family made.
// action 'cancel' just closes the request. Teachers and admins are never deleted by this route.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { requestId, action } = await req.json();
    if (typeof requestId !== 'string') return NextResponse.json({ data: null, error: 'missing_request' }, { status: 400 });
    const service = createServiceClient();
    const { data: reqRow } = await service.from('data_requests').select('*').eq('id', requestId).maybeSingle();
    if (!reqRow || reqRow.status !== 'requested') return NextResponse.json({ data: null, error: 'request_not_open' }, { status: 404 });
    if (action === 'cancel') {
      await service.from('data_requests').update({ status: 'cancelled', completed_at: new Date().toISOString(), student_id: null, student_label: null }).eq('id', requestId);
      return NextResponse.json({ data: { ok: true }, error: null });
    }
    const { data: user } = await service.from('users').select('id, role, email').eq('auth_user_id', reqRow.auth_user_id).maybeSingle();
    if (user && user.role !== 'student') return NextResponse.json({ data: null, error: 'not_a_student_account' }, { status: 400 });
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').toLowerCase().split(',').map((e) => e.trim());
    if (user && adminEmails.includes(String(user.email).toLowerCase())) return NextResponse.json({ data: null, error: 'admin_account_protected' }, { status: 400 });
    // students cascade to all learning data
    if (user) {
      // These two only unlink (set null) when a student is deleted; remove the rows themselves (feedback holds an email and free text).
      const { data: stRows } = await service.from('students').select('id').eq('user_id', user.id);
      for (const st of stRows ?? []) {
        await service.from('feedback').delete().eq('student_id', st.id);
        await service.from('learning_events').delete().eq('student_id', st.id);
      }
      const { error: e1 } = await service.from('students').delete().eq('user_id', user.id);
      if (e1) throw e1;
      const { error: e2 } = await service.from('users').delete().eq('id', user.id);
      if (e2) throw e2;
    }
    await service.from('account_devices').delete().eq('auth_user_id', reqRow.auth_user_id);
    const { error: authErr } = await service.auth.admin.deleteUser(reqRow.auth_user_id);
    if (authErr && !/not found/i.test(authErr.message)) throw authErr;
    await service.from('data_requests').update({ status: 'completed', completed_at: new Date().toISOString(), student_id: null, student_label: null }).eq('id', requestId);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
