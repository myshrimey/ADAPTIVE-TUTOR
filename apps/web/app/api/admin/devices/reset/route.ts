import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';

// Founder-only: clear the registered devices of one student's login (family changed computer/phone).
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { studentId } = await req.json();
    if (typeof studentId !== 'string') return NextResponse.json({ data: null, error: 'missing_student' }, { status: 400 });
    const service = createServiceClient();
    const { data: row } = await service.from('students').select('users(auth_user_id)').eq('id', studentId).single();
    const authId = (row as any)?.users?.auth_user_id;
    if (!authId) return NextResponse.json({ data: null, error: 'student_not_found' }, { status: 404 });
    const { error } = await service.from('account_devices').delete().eq('auth_user_id', authId);
    if (error) throw error;
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
