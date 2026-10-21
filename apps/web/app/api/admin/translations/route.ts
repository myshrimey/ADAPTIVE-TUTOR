import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { createAIProvider, recordAIAttempt, ensureHindiTranslations, hasDevanagari, HINDI_MEDIUM_EXCLUDED_SUBJECTS } from '@adaptive-tutor/core';

export const maxDuration = 60;

// Admin-only: translate the next batch of a subject's questions into Hindi ahead of time (free-tier AI), so students
// starting a Hindi-medium paper do not wait. Safe to press repeatedly: it only does questions without Hindi yet.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const subjectId = String(body.subjectId ?? '');
    const limit = Math.min(30, Math.max(6, Number(body.limit) || 18));
    const service = createServiceClient();
    const { data: subj } = await service.from('subjects').select('id, slug').eq('id', subjectId).maybeSingle();
    if (!subj || HINDI_MEDIUM_EXCLUDED_SUBJECTS.includes(subj.slug)) return NextResponse.json({ data: null, error: 'subject_not_translatable' }, { status: 400 });
    const { data: qs } = await service.from('diagnostic_questions').select('id, prompt, diagnostic_tests!inner(subject_id, is_active)').eq('diagnostic_tests.subject_id', subjectId).eq('diagnostic_tests.is_active', true).neq('content_status', 'rejected').limit(5000);
    const { data: done } = await service.from('question_translations').select('question_id').eq('lang', 'hi').limit(50000);
    const have = new Set((done ?? []).map((r: any) => r.question_id));
    const todo = (qs ?? []).filter((q: any) => !have.has(q.id) && !hasDevanagari(q.prompt)).map((q: any) => q.id as string);
    const saved = await ensureHindiTranslations(service, createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') }), todo.slice(0, limit), { budgetMs: 45_000 });
    return NextResponse.json({ data: { saved, remaining: Math.max(0, todo.length - saved) }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
