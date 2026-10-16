import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
    const service = createServiceClient();
    const { data: userRow } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();
    if (!userRow || userRow.role !== 'teacher') return NextResponse.json({ data: null, error: 'not_a_teacher' }, { status: 403 });
    const { data: tp } = await service.from('teacher_profiles').select('display_name, status').eq('user_id', userRow.id).maybeSingle();
    return NextResponse.json({ data: { displayName: tp?.display_name ?? '', status: tp?.status ?? 'pending' }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
