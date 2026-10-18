import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

// Admin-only: approve or suspend a tutor / coaching centre / parent account. A suspended account sees nothing
// (linkedStudentIds returns nothing unless the profile is active).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.action === 'approve' ? 'active' : body.action === 'suspend' ? 'suspended' : null;
    if (!status) return NextResponse.json({ data: null, error: 'bad_request' }, { status: 400 });
    const service = createServiceClient();
    const { error } = await service.from('adult_profiles').update({ status, approved_at: status === 'active' ? new Date().toISOString() : null }).eq('user_id', id);
    if (error) throw error;
    return NextResponse.json({ data: { status }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
