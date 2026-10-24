import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadStoredBaseline, asBaseline, studentReport } from '@adaptive-tutor/core';

// The student's own latest baseline (student wording only; adult reports have their own pages).
export async function GET(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const subjectId = new URL(request.url).searchParams.get('subjectId');
    if (!subjectId) return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    const service = createServiceClient();
    const sb = await loadStoredBaseline(service, studentId, subjectId);
    if (!sb) return NextResponse.json({ data: null, error: null });
    const { data: subj } = await service.from('subjects').select('name').eq('id', subjectId).maybeSingle();
    const b = asBaseline(sb);
    return NextResponse.json({ data: { version: sb.version, createdAt: sb.createdAt, lines: studentReport(b, (subj as any)?.name ?? 'your subject'), overall: sb.overall?.text ?? '', confidence: sb.confidence, profile: b.profile.map((p) => ({ label: p.label, text: p.text, demonstratedLevel: p.demonstratedLevel, developingLevel: p.developingLevel, confidence: p.confidence })), path: sb.path, changes: sb.changes, targetClass: b.targetClass }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
