import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { buildParentReport } from '@adaptive-tutor/core';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const report = await buildParentReport(supabase, studentId);
    return NextResponse.json({ data: report, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
