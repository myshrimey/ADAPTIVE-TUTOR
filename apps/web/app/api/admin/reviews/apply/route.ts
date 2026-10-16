import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

// Admin-only: turn teacher feedback into a decision on the question itself.
//   verify -> content_status 'verified'   reject -> 'rejected' (never shown again)
//   reset  -> back to 'needs_review'
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const table = String(body.table ?? '');
    const itemId = String(body.itemId ?? '');
    const action = String(body.action ?? '');
    if (!['questions', 'diagnostic_questions'].includes(table) || !itemId) return NextResponse.json({ data: null, error: 'invalid_item' }, { status: 400 });
    const status = action === 'verify' ? 'verified' : action === 'reject' ? 'rejected' : action === 'reset' ? 'needs_review' : null;
    if (!status) return NextResponse.json({ data: null, error: 'invalid_action' }, { status: 400 });
    const { error } = await createServiceClient().from(table).update({ content_status: status }).eq('id', itemId);
    if (error) throw error;
    return NextResponse.json({ data: { status }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
