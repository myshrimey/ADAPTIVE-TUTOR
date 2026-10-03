import type { SupabaseClient } from '@supabase/supabase-js';
import type { Curriculum, Subject, Chapter, Topic, Skill } from './types';

// Every function here takes a SupabaseClient rather than constructing its own —
// callers pass either the session-bound client (RLS-gated reads, fine here since
// curriculum content is readable by any authenticated user) or the service client.
// This keeps `core` framework-agnostic: it doesn't know about Next.js cookies.

/**
 * Loads the full curriculum tree (subjects -> chapters -> topics -> skills, with
 * each skill's resolved prerequisite ids) for a given board/class. Curriculum
 * content is small (a handful of chapters in the MVP) so one query per level,
 * assembled in memory, is simpler and fast enough — no need for a recursive CTE yet.
 */
export async function loadCurriculum(
  supabase: SupabaseClient,
  board: string,
  klass: string
): Promise<Curriculum> {
  const { data: curriculumRow, error: curErr } = await supabase
    .from('curricula')
    .select('id, board, class, version')
    .eq('board', board)
    .eq('class', klass)
    .single();
  if (curErr || !curriculumRow) throw new Error(`curriculum_not_found: ${board} ${klass}`);

  const { data: subjectRows, error: subErr } = await supabase
    .from('subjects')
    .select('id, curriculum_id, name, slug')
    .eq('curriculum_id', curriculumRow.id);
  if (subErr) throw subErr;

  const subjects: Subject[] = [];
  for (const subjectRow of subjectRows ?? []) {
    const { data: chapterRows, error: chErr } = await supabase
      .from('chapters')
      .select('id, subject_id, name, slug, sequence')
      .eq('subject_id', subjectRow.id)
      .order('sequence');
    if (chErr) throw chErr;

    const chapters: Chapter[] = [];
    for (const chapterRow of chapterRows ?? []) {
      const { data: topicRows, error: tErr } = await supabase
        .from('topics')
        .select('id, chapter_id, name, slug, sequence')
        .eq('chapter_id', chapterRow.id)
        .order('sequence');
      if (tErr) throw tErr;

      const topics: Topic[] = [];
      for (const topicRow of topicRows ?? []) {
        const { data: skillRows, error: sErr } = await supabase
          .from('skills')
          .select('id, topic_id, name, slug')
          .eq('topic_id', topicRow.id);
        if (sErr) throw sErr;

        const skills: Skill[] = [];
        for (const skillRow of skillRows ?? []) {
          const { data: prereqRows, error: pErr } = await supabase
            .from('prerequisites')
            .select('requires_skill_id')
            .eq('skill_id', skillRow.id);
          if (pErr) throw pErr;

          skills.push({
            id: skillRow.id,
            topicId: skillRow.topic_id,
            name: skillRow.name,
            slug: skillRow.slug,
            requiresSkillIds: (prereqRows ?? []).map((r) => r.requires_skill_id),
          });
        }

        topics.push({
          id: topicRow.id,
          chapterId: topicRow.chapter_id,
          name: topicRow.name,
          slug: topicRow.slug,
          sequence: topicRow.sequence,
          skills,
        });
      }

      chapters.push({
        id: chapterRow.id,
        subjectId: chapterRow.subject_id,
        name: chapterRow.name,
        slug: chapterRow.slug,
        sequence: chapterRow.sequence,
        topics,
      });
    }

    subjects.push({
      id: subjectRow.id,
      curriculumId: subjectRow.curriculum_id,
      name: subjectRow.name,
      slug: subjectRow.slug,
      chapters,
    });
  }

  return { id: curriculumRow.id, board: curriculumRow.board, class: curriculumRow.class, version: curriculumRow.version, subjects };
}

/**
 * Walks the prerequisite graph backwards from a skill and returns the full
 * chain of skills that must be mastered first, ordered so the most foundational
 * skill comes first. Used by the orchestrator's prerequisite check (Day 4) and
 * by PREREQUISITE_REPAIR to pick where to send the student.
 */
export async function getPrerequisiteChain(supabase: SupabaseClient, skillId: string): Promise<Skill[]> {
  const visited = new Set<string>();
  const chain: Skill[] = [];

  async function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const { data: prereqRows, error: pErr } = await supabase
      .from('prerequisites')
      .select('requires_skill_id')
      .eq('skill_id', id);
    if (pErr) throw pErr;

    for (const row of prereqRows ?? []) {
      await visit(row.requires_skill_id);
    }

    const { data: skillRow, error: sErr } = await supabase
      .from('skills')
      .select('id, topic_id, name, slug')
      .eq('id', id)
      .single();
    if (sErr || !skillRow) throw new Error(`skill_not_found: ${id}`);

    // Don't include the starting skill itself in its own prerequisite chain.
    if (id !== skillId) {
      chain.push({ id: skillRow.id, topicId: skillRow.topic_id, name: skillRow.name, slug: skillRow.slug, requiresSkillIds: [] });
    }
  }

  await visit(skillId);
  return chain;
}
