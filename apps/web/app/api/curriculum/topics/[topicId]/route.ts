import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getPrerequisiteChain } from '@adaptive-tutor/core';

export async function GET(_request: Request, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    const supabase = await createServerClient();

    const { data: topic, error: topicErr } = await supabase
      .from('topics')
      .select('id, chapter_id, name, slug, sequence')
      .eq('id', topicId)
      .single();
    if (topicErr || !topic) throw topicErr ?? new Error('topic_not_found');

    const { data: skills, error: skillErr } = await supabase
      .from('skills')
      .select('id, name, slug')
      .eq('topic_id', topic.id);
    if (skillErr) throw skillErr;

    const skillsWithPrereqs = await Promise.all(
      (skills ?? []).map(async (skill) => ({
        ...skill,
        prerequisiteChain: await getPrerequisiteChain(supabase, skill.id),
      }))
    );

    return NextResponse.json({ data: { ...topic, skills: skillsWithPrereqs }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
