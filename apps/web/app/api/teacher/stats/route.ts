import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireApprovedTeacher } from '@/lib/teacher';

// How much review work this teacher has done (a record of contribution; any payment for
// it is arranged separately by the founder).
export async function GET() {
  try {
    const teacher = await requireApprovedTeacher();
    const service = createServiceClient();
    const { data } = await service.from('content_reviews').select('verdict, created_at').eq('teacher_user_id', teacher.userId).limit(5000);
    const since = Date.now() - 30 * 24 * 3600 * 1000;
    const rows = data ?? [];
    return NextResponse.json({
      data: {
        total: rows.length,
        last30Days: rows.filter((r: any) => Date.parse(r.created_at) >= since).length,
        approve: rows.filter((r: any) => r.verdict === 'approve').length,
        needsFix: rows.filter((r: any) => r.verdict === 'needs_fix').length,
        reject: rows.filter((r: any) => r.verdict === 'reject').length,
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 403 });
  }
}
