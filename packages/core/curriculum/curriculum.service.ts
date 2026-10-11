import type { SupabaseClient } from '@supabase/supabase-js';
import type { Curriculum, Subject, Chapter, Topic, Skill } from './types';

// Every function here takes a SupabaseClient rather than constructing its own —
// callers pass either the session-bound client (RLS-gated reads, fine here since
// curriculum content is readable by any authenticated user) or the service client.
// This keeps `core` framework-agnostic: it doesn't know about Next.js cookies.

/**
 * Loads the full curriculum tree (subjects -> chapters -> topics -> skills, with
 * each skill's resolved prerequisite ids) for a given board/class.
 *
 * This used to walk the tree with one query per chapter, per topic, per skill
 * AND per skill's prerequisites — serial, awaited one at a time. With ~100
 * skills across Maths/Science that was 150+ sequential round trips to
 * Supabase on every single call (and this function is called on nearly every
 * page load and session start), which is what made the app feel slow to
 * load and slow to switch between pages. It's rewritten here to run a fixed
 * six queries total — one per level, fetched by the parent ids already known
 * from the previous level, mostly in parallel — and assemble the tree in
 * memory. Same output, a few queries instead of hundreds.
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

  const subjectIds = (subjectRows ?? []).map((s) => s.id);
  if (subjectIds.length === 0) {
    return { id: curriculumRow.id, board: curriculumRow.board, class: curriculumRow.class, version: curriculumRow.version, subjects: [] };
  }

  const [{ data: chapterRows, error: chErr }] = await Promise.all([
    supabase.from('chapters').select('id, subject_id, name, slug, sequence').in('subject_id', subjectIds).order('sequence'),
  ]);
  if (chErr) throw chErr;
  const chapterIds = (chapterRows ?? []).map((c) => c.id);

  const [{ data: topicRows, error: tErr }] = await Promise.all([
    chapterIds.length
      ? supabase.from('topics').select('id, chapter_id, name, slug, sequence').in('chapter_id', chapterIds).order('sequence')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (tErr) throw tErr;
  const topicIds = (topicRows ?? []).map((t) => t.id);

  const [{ data: skillRows, error: sErr }] = await Promise.all([
    topicIds.length
      ? supabase.from('skills').select('id, topic_id, name, slug').in('topic_id', topicIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (sErr) throw sErr;
  const skillIds = (skillRows ?? []).map((s) => s.id);

  const { data: prereqRows, error: pErr } = skillIds.length
    ? await supabase.from('prerequisites').select('skill_id, requires_skill_id').in('skill_id', skillIds)
    : { data: [], error: null };
  if (pErr) throw pErr;

  const prereqsBySkill = new Map<string, string[]>();
  for (const row of prereqRows ?? []) {
    if (!prereqsBySkill.has(row.skill_id)) prereqsBySkill.set(row.skill_id, []);
    prereqsBySkill.get(row.skill_id)!.push(row.requires_skill_id);
  }

  const skillsByTopic = new Map<string, Skill[]>();
  for (const row of skillRows ?? []) {
    const skill: Skill = {
      id: row.id,
      topicId: row.topic_id,
      name: row.name,
      slug: row.slug,
      requiresSkillIds: prereqsBySkill.get(row.id) ?? [],
    };
    if (!skillsByTopic.has(row.topic_id)) skillsByTopic.set(row.topic_id, []);
    skillsByTopic.get(row.topic_id)!.push(skill);
  }

  const topicsByChapter = new Map<string, Topic[]>();
  for (const row of topicRows ?? []) {
    const topic: Topic = {
      id: row.id,
      chapterId: row.chapter_id,
      name: row.name,
      slug: row.slug,
      sequence: row.sequence,
      skills: skillsByTopic.get(row.id) ?? [],
    };
    if (!topicsByChapter.has(row.chapter_id)) topicsByChapter.set(row.chapter_id, []);
    topicsByChapter.get(row.chapter_id)!.push(topic);
  }

  const chaptersBySubject = new Map<string, Chapter[]>();
  for (const row of chapterRows ?? []) {
    const chapter: Chapter = {
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      slug: row.slug,
      sequence: row.sequence,
      topics: topicsByChapter.get(row.id) ?? [],
    };
    if (!chaptersBySubject.has(row.subject_id)) chaptersBySubject.set(row.subject_id, []);
    chaptersBySubject.get(row.subject_id)!.push(chapter);
  }

  const subjects: Subject[] = (subjectRows ?? []).map((row) => ({
    id: row.id,
    curriculumId: row.curriculum_id,
    name: row.name,
    slug: row.slug,
    chapters: chaptersBySubject.get(row.id) ?? [],
  }));

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
