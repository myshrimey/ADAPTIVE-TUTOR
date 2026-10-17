import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { gradeAnswer, spreadAcrossChapters } from '@adaptive-tutor/core';

// Public free readiness check: no account, nothing saved. A handful of multiple-choice questions
// from a READY subject; the answer key is never sent to the browser, and after submitting only
// right/wrong per chapter comes back (no correct answers, no explanations), so the question bank
// is not handed out through this page.
const COUNT = 8;
const MAX_IDS = 12;

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('subject') ?? 'maths';
    const service = createServiceClient();
    const { data: subject } = await service.from('subjects').select('id, name, status').eq('slug', slug).maybeSingle();
    if (!subject || subject.status !== 'ready') return NextResponse.json({ data: null, error: 'subject_not_available' }, { status: 400 });

    const { data: bank, error } = await service
      .from('diagnostic_questions')
      .select('id, prompt, options, difficulty, skills(topics(chapters(id, name))), diagnostic_tests!inner(subject_id, is_active)')
      .eq('diagnostic_tests.subject_id', subject.id)
      .eq('diagnostic_tests.is_active', true)
      .eq('question_type', 'mcq')
      .lte('difficulty', 3)
      .neq('content_status', 'rejected')
      .limit(400);
    if (error) throw error;
    const items = (bank ?? []).map((q: any) => ({ id: q.id as string, chapterId: (q.skills?.topics?.chapters?.id as string) ?? 'none', prompt: q.prompt as string, options: q.options as string[] | null }));
    if (items.length < COUNT) return NextResponse.json({ data: null, error: 'not_enough_questions' }, { status: 400 });
    const picked = spreadAcrossChapters(items, COUNT).filter((q) => Array.isArray(q.options));
    return NextResponse.json({ data: { subject: subject.name, questions: picked.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })) }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const answers = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {};
    const ids = Object.keys(answers).slice(0, MAX_IDS);
    if (ids.length === 0) return NextResponse.json({ data: null, error: 'no_answers' }, { status: 400 });
    const service = createServiceClient();
    const { data: rows, error } = await service
      .from('diagnostic_questions')
      .select('id, expected_answer, skills(topics(chapters(name)))')
      .in('id', ids);
    if (error) throw error;
    const byChapter = new Map<string, { correct: number; total: number }>();
    let correct = 0;
    for (const q of (rows ?? []) as any[]) {
      const given = String(answers[q.id] ?? '').slice(0, 200);
      const ok = given.length > 0 && gradeAnswer(q.expected_answer, given);
      if (ok) correct++;
      const ch = q.skills?.topics?.chapters?.name ?? 'Other';
      const c = byChapter.get(ch) ?? { correct: 0, total: 0 };
      c.total++;
      if (ok) c.correct++;
      byChapter.set(ch, c);
    }
    const total = (rows ?? []).length;
    return NextResponse.json({
      data: { correct, total, byChapter: [...byChapter.entries()].map(([chapter, v]) => ({ chapter, ...v })).sort((a, b) => a.correct / a.total - b.correct / b.total) },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
