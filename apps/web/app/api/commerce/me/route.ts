import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { creditBalance, ensureMonthlyCredits, getAccess } from '@adaptive-tutor/core';

// The signed-in student's plan, credits and purchase requests (read-only).
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    await ensureMonthlyCredits(service, studentId);
    const [access, credits, { data: pays }] = await Promise.all([
      getAccess(service, studentId), creditBalance(service, studentId),
      service.from('pilot_payments').select('id, offer_label, amount, status, created_at, product_code').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
    ]);
    return NextResponse.json({ data: { access, credits, payments: pays ?? [] }, error: null });
  } catch (e: any) { return NextResponse.json({ data: null, error: e?.message ?? 'error' }, { status: 401 }); }
}
