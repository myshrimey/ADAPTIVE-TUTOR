import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getContributor } from '@/lib/contributor';

// Subject and skill names for the upload form (no questions, no answers).
export async function GET() {
  try {
    if (!(await getContributor())) return NextResponse.json({ data: null, error: 'not_allowed' }, { status: 403 });
    const service = createServiceClient();
    const { data: subs } = await service.from('subjects').select('id, name').order('name');
    const out: Array<{ subjectId: string; subject: string; skills: Array<{ id: string; name: string }> }> = [];
    for (const s of (subs ?? []) as any[]) {
      const { data: chs } = await service.from('chapters').select('id').eq('subject_id', s.id);
      const chIds = ((chs ?? []) as any[]).map((c) => c.id);
      const { data: tps } = chIds.length ? await service.from('topics').select('id').in('chapter_id', chIds) : { data: [] };
      const tIds = ((tps ?? []) as any[]).map((t) => t.id);
      const { data: sk } = tIds.length ? await service.from('skills').select('id, name, retired').in('topic_id', tIds) : { data: [] };
      out.push({ subjectId: s.id, subject: s.name, skills: ((sk ?? []) as any[]).filter((x) => !x.retired).map((x) => ({ id: x.id, name: x.name })) });
    }
    return NextResponse.json({ data: out, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
