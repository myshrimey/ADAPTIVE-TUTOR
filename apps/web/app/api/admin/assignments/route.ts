import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { assignTeacher, endAssignment } from '@adaptive-tutor/core';

// Academic team / Super Admin only. A record of who teaches whom; it never opens a student's data to the teacher.
const fail = (e: any) => NextResponse.json({ data: null, error: e?.message === 'not_authorized' ? 'not_authorized' : 'failed' }, { status: e?.message === 'not_authorized' ? 403 : 400 });
export async function POST(request: Request) {
  try { const a = await requireAdmin('academic'); const b = await request.json().catch(() => ({}));
    const r = await assignTeacher(createServiceClient(), a.email, String(b.teacherUser ?? ''), String(b.studentId ?? ''), b.note);
    return NextResponse.json({ data: r.ok ? { ok: true } : null, error: r.ok ? null : r.error }, { status: r.ok ? 200 : 400 }); } catch (e) { return fail(e); }
}
export async function DELETE(request: Request) {
  try { const a = await requireAdmin('academic'); const b = await request.json().catch(() => ({}));
    const r = await endAssignment(createServiceClient(), a.email, String(b.id ?? ''));
    return NextResponse.json({ data: r, error: r.ok ? null : 'not_found' }, { status: r.ok ? 200 : 404 }); } catch (e) { return fail(e); }
}
