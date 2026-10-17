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
    if (action === 'set_details') {
      // Founder copies a teacher's suggested marks / level (or types his own) onto the question.
      const upd: Record<string, unknown> = {};
      const m = Number(body.marks);
      if (body.marks !== undefined && body.marks !== null && body.marks !== '') {
        if (!Number.isInteger(m) || m < 1 || m > 20) return NextResponse.json({ data: null, error: 'invalid_marks' }, { status: 400 });
        upd.marks = m;
      }
      if (body.cognitiveLevel) {
        if (!['recall', 'understand', 'apply', 'analyse'].includes(String(body.cognitiveLevel))) return NextResponse.json({ data: null, error: 'invalid_level' }, { status: 400 });
        upd.cognitive_level = String(body.cognitiveLevel);
      }
      if (Object.keys(upd).length === 0) return NextResponse.json({ data: null, error: 'nothing_to_set' }, { status: 400 });
      const { error: e2 } = await createServiceClient().from(table).update(upd).eq('id', itemId);
      if (e2) throw e2;
      return NextResponse.json({ data: { status: null, saved: true }, error: null });
    }
    const status = action === 'verify' ? 'verified' : action === 'reject' ? 'rejected' : action === 'reset' ? 'needs_review' : null;
    if (!status) return NextResponse.json({ data: null, error: 'invalid_action' }, { status: 400 });
    const { error } = await createServiceClient().from(table).update({ content_status: status }).eq('id', itemId);
    if (error) throw error;
    return NextResponse.json({ data: { status }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
