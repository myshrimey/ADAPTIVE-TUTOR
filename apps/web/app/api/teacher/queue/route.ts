import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireApprovedTeacher } from '@/lib/teacher';

const PAGE = 10;
const SCAN = 40;

// Items still waiting for review (content_status = needs_review) in one subject, that this
// teacher has not reviewed yet. Reads use the service client AFTER the approved-teacher
// check, so the teacher gets the answer key (needed to judge it) without relying on
// open table policies. Nothing here lets a teacher change any question.
export async function GET(request: Request) {
  try {
    const teacher = await requireApprovedTeacher();
    const url = new URL(request.url);
    const subjectId = url.searchParams.get('subjectId');
    const bank = url.searchParams.get('bank') === 'practice' ? 'questions' : 'diagnostic_questions';
    const onlyGenerated = url.searchParams.get('source') === 'generated';
    const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
    if (!subjectId) return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });

    const service = createServiceClient();
    const { data: chapters } = await service.from('chapters').select('id, name').eq('subject_id', subjectId);
    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    if (chapterIds.length === 0) return NextResponse.json({ data: { items: [], nextOffset: offset }, error: null });
    const { data: topics } = await service.from('topics').select('id, chapter_id').in('chapter_id', chapterIds);
    const topicIds = (topics ?? []).map((t: any) => t.id);
    const { data: skills } = topicIds.length ? await service.from('skills').select('id, name, topic_id').in('topic_id', topicIds) : { data: [] as any[] };
    const chapterByTopic = new Map((topics ?? []).map((t: any) => [t.id, t.chapter_id]));
    const chapterName = new Map((chapters ?? []).map((c: any) => [c.id, c.name]));
    const skillInfo = new Map((skills ?? []).map((s: any) => [s.id, { skill: s.name, chapter: chapterName.get(chapterByTopic.get(s.topic_id)) ?? '' }]));
    const skillIds = [...skillInfo.keys()];
    if (skillIds.length === 0) return NextResponse.json({ data: { items: [], nextOffset: offset }, error: null });

    let q = service
      .from(bank)
      .select('id, skill_id, difficulty, question_type, prompt, options, expected_answer, explanation, figure_url, figure_caption, source')
      .eq('content_status', 'needs_review')
      .in('skill_id', skillIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + SCAN - 1);
    if (onlyGenerated) q = q.eq('source', 'generated');
    const { data: rows, error } = await q;
    if (error) throw error;

    const ids = (rows ?? []).map((r: any) => r.id);
    const { data: mine } = ids.length
      ? await service.from('content_reviews').select('item_id').eq('teacher_user_id', teacher.userId).eq('item_table', bank).in('item_id', ids)
      : { data: [] as any[] };
    const done = new Set((mine ?? []).map((m: any) => m.item_id));

    const items = (rows ?? [])
      .filter((r: any) => !done.has(r.id))
      .slice(0, PAGE)
      .map((r: any) => ({
        id: r.id,
        table: bank,
        chapter: skillInfo.get(r.skill_id)?.chapter ?? '',
        skill: skillInfo.get(r.skill_id)?.skill ?? '',
        difficulty: r.difficulty,
        questionType: r.question_type,
        prompt: r.prompt,
        options: r.options ?? null,
        expectedAnswer: typeof r.expected_answer === 'object' && r.expected_answer !== null && 'value' in r.expected_answer ? String(r.expected_answer.value) : String(r.expected_answer ?? ''),
        explanation: r.explanation ?? null,
        figureUrl: r.figure_url ?? null,
        figureCaption: r.figure_caption ?? null,
        source: r.source,
      }));
    return NextResponse.json({ data: { items, nextOffset: offset + SCAN, exhausted: (rows ?? []).length < SCAN }, error: null });
  } catch (err: any) {
    const forbidden = ['not_a_teacher', 'teacher_not_approved', 'unauthenticated'].includes(err.message);
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: forbidden ? 403 : 400 });
  }
}
