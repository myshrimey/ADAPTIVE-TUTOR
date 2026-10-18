import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { recordHandwritingConsent, getHandwritingConsent, ANSWER_BANK_ENABLED, HANDWRITING_CONSENT_VERSION } from '@adaptive-tutor/core';

// Parent/guardian consent for photos of handwritten answers. The student id comes from the session.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const c = await getHandwritingConsent(createServiceClient(), studentId);
    return NextResponse.json({ data: { ...c, bankAvailable: ANSWER_BANK_ENABLED, version: HANDWRITING_CONSENT_VERSION }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (body.agree !== true) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 400 });
    // The separate "keep for the question bank" tick only counts while the founder has that feature switched on.
    await recordHandwritingConsent(createServiceClient(), studentId, ANSWER_BANK_ENABLED && body.keepForBank === true);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}
