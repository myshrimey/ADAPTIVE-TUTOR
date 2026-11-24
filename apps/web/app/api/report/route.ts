import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { buildParentReport, publicError, recordActivityForStudent } from '@adaptive-tutor/core';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const report = await buildParentReport(supabase, studentId);
    await recordActivityForStudent(createServiceClient(), studentId, { type: 'report_viewed', role: 'student' });
    return NextResponse.json({ data: report, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}
