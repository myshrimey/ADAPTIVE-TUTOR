import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { revalidateSubject } from '@adaptive-tutor/core';

export const runtime = 'nodejs';
export const maxDuration = 60;
// ADMIN ONLY. A person marks a translation checked or rejected; or the automatic checks are re-run for a subject.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const b = await req.json(); const s = createServiceClient();
    if (b.action === 'check') {
      const status = String(b.status);
      if (!['teacher_checked', 'rejected', 'ai_translated'].includes(status)) throw new Error('Unknown status.');
      const note = typeof b.note === 'string' ? b.note.trim().slice(0, 300) || null : null;
      const { error } = await s.from('question_translations').update({ status, checked_by: status === 'ai_translated' ? null : admin.email, checked_at: status === 'ai_translated' ? null : new Date().toISOString(), reviewer_note: note }).eq('question_id', String(b.questionId)).eq('lang', 'hi');
      if (error) throw new Error('Could not save (has migration 0033 been run?).');
      return NextResponse.json({ data: { ok: true }, error: null });
    }
    if (b.action === 'revalidate') return NextResponse.json({ data: await revalidateSubject(s, String(b.subjectId)), error: null });
    throw new Error('Unknown action.');
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message === 'not_authorized' ? 'not_authorized' : String(err.message ?? 'failed').slice(0, 140) }, { status: err.message === 'not_authorized' ? 403 : 400 }); }
}
