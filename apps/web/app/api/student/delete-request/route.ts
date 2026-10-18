import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';

// A family asks for the student's data to be deleted. This only records the request (ids come from the
// signed-in session, never from the request body); the founder carries it out and confirms.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== 'DELETE') return NextResponse.json({ data: null, error: 'confirm_required' }, { status: 400 });
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'not_signed_in' }, { status: 401 });
    const { data: st } = await supabase.from('students').select('display_name').eq('id', studentId).maybeSingle();
    const service = createServiceClient();
    const { data: open } = await service.from('data_requests').select('id').eq('auth_user_id', user.id).eq('status', 'requested').maybeSingle();
    if (open) return NextResponse.json({ data: { alreadyRequested: true }, error: null });
    const { error } = await service.from('data_requests').insert({ auth_user_id: user.id, student_id: studentId, student_label: st?.display_name ?? null, kind: 'delete' });
    if (error) throw error;
    return NextResponse.json({ data: { requested: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}

export async function GET() {
  try {
    await getCurrentStudentId();
    const supabase = await createServerClient();
    const { data } = await supabase.from('data_requests').select('status, requested_at').order('requested_at', { ascending: false }).limit(1);
    return NextResponse.json({ data: data?.[0] ?? null, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}
