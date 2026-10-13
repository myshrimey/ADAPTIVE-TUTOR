import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { submitPaymentClaim, getMyPaymentClaims } from '@adaptive-tutor/core';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const claims = await getMyPaymentClaims(supabase, studentId);
    return NextResponse.json({ data: claims, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json();
    const { amount, paymentDate, transactionReference } = body as { amount: number; paymentDate: string; transactionReference?: string };
    if (!amount || !paymentDate) {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }
    const supabase = await createServerClient();
    await submitPaymentClaim(supabase, studentId, { amount, paymentDate, transactionReference });
    return NextResponse.json({ data: { submitted: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
