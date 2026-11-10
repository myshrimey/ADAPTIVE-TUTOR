import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { submitPaymentClaim, getMyPaymentClaims, publicError, cleanPaymentClaim } from '@adaptive-tutor/core';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const claims = await getMyPaymentClaims(supabase, studentId);
    return NextResponse.json({ data: claims, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json();
    // v120: amount, date, reference and plan code are checked before anything is saved.
    const checked = cleanPaymentClaim(body);
    if (!checked.ok) return NextResponse.json({ data: null, error: checked.code }, { status: 400 });
    const supabase = await createServerClient();
    await submitPaymentClaim(supabase, studentId, checked.claim);
    return NextResponse.json({ data: { submitted: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}
