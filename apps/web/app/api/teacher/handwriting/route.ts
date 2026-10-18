import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireApprovedTeacher } from '@/lib/teacher';
import { listTeacherQueue } from '@adaptive-tutor/core';

// Handwritten answers waiting for a teacher. No student name or email is ever included.
export async function GET() {
  try {
    await requireApprovedTeacher();
    return NextResponse.json({ data: { items: await listTeacherQueue(createServiceClient()) }, error: null });
  } catch (err: any) {
    const forbidden = ['not_a_teacher', 'teacher_not_approved', 'unauthenticated'].includes(err.message);
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: forbidden ? 403 : 400 });
  }
}
