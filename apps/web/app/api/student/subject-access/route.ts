import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { getAccess, subjectFamily } from '@adaptive-tutor/core';

// What the subject picker needs to say how many subjects this account can use and which ones are already taken. Read-only, session-derived id.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const access = await getAccess(service, studentId);
    const { data: goals } = await service.from('learning_goals').select('subject_id, subjects(slug, name)').eq('student_id', studentId).eq('status', 'active');
    const chosen = ((goals ?? []) as any[]).filter((g) => g.subjects?.slug).map((g) => ({ id: g.subject_id as string, name: g.subjects.name as string, family: subjectFamily(g.subjects.slug) }));
    const planCode = access.status === 'none' ? 'free' : access.planCode;
    const limit = access.status === 'none' ? 1 : access.subjectLimit;
    return NextResponse.json({ data: { planCode, isFree: planCode === 'free', subjectLimit: limit, chosen, families: [...new Set(chosen.map((c) => c.family))] }, error: null });
  } catch (e: any) { return NextResponse.json({ data: null, error: e?.message ?? 'error' }, { status: 401 }); }
}
