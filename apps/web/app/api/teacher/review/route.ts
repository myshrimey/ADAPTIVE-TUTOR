import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireApprovedTeacher } from '@/lib/teacher';

const VERDICTS = ['approve', 'needs_fix', 'reject'];
const TABLES = ['questions', 'diagnostic_questions'];

// Saves one teacher's feedback on one question. The teacher id always comes from the
// session. This only writes feedback — it never changes the question itself.
export async function POST(request: Request) {
  try {
    const teacher = await requireApprovedTeacher();
    const body = await request.json().catch(() => ({}));
    const table = String(body.table ?? '');
    const itemId = String(body.itemId ?? '');
    const verdict = String(body.verdict ?? '');
    const comment = String(body.comment ?? '').trim().slice(0, 2000) || null;
    const suggestedAnswer = String(body.suggestedAnswer ?? '').trim().slice(0, 500) || null;
    const suggestedExplanation = String(body.suggestedExplanation ?? '').trim().slice(0, 2000) || null;

    if (!TABLES.includes(table) || !itemId) return NextResponse.json({ data: null, error: 'invalid_item' }, { status: 400 });
    if (!VERDICTS.includes(verdict)) return NextResponse.json({ data: null, error: 'invalid_verdict' }, { status: 400 });
    if ((verdict === 'needs_fix' || verdict === 'reject') && !comment) return NextResponse.json({ data: null, error: 'comment_required' }, { status: 400 });

    const service = createServiceClient();
    const { data: exists } = await service.from(table).select('id').eq('id', itemId).maybeSingle();
    if (!exists) return NextResponse.json({ data: null, error: 'item_not_found' }, { status: 404 });

    const { error } = await service.from('content_reviews').upsert(
      { teacher_user_id: teacher.userId, item_table: table, item_id: itemId, verdict, comment, suggested_answer: suggestedAnswer, suggested_explanation: suggestedExplanation, updated_at: new Date().toISOString() },
      { onConflict: 'teacher_user_id,item_table,item_id' }
    );
    if (error) throw error;
    return NextResponse.json({ data: { saved: true }, error: null });
  } catch (err: any) {
    const forbidden = ['not_a_teacher', 'teacher_not_approved', 'unauthenticated'].includes(err.message);
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: forbidden ? 403 : 400 });
  }
}
