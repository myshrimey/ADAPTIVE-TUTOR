import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubjectStatus } from '../curriculum/types';

// Subject catalogue + per-student registration (master prompt sec. 5-6).
//
// "Registered" == the student has an active learning_goals row for the subject.
// That table already held one row per (student, subject) — the old onboarding
// UI simply only ever created one. So multi-subject needed no new table; it
// needed (a) several rows to be created, (b) a way to say which is currently
// active (learning_goals.activated_at, migration 0013), and (c) a readiness
// status on the subject itself so the UI never implies every listed subject is
// fully supported.

/** Subjects a student is allowed to register for / study. 'coming_soon' and 'in_development' are listed but not usable. */
export const USABLE_SUBJECT_STATUSES: SubjectStatus[] = ['ready', 'pilot'];

export function isUsableSubjectStatus(status: string | null | undefined): boolean {
  return USABLE_SUBJECT_STATUSES.includes((status ?? 'ready') as SubjectStatus);
}

export interface SubjectCatalogueEntry {
  id: string;
  name: string;
  slug: string;
  status: SubjectStatus;
  description: string | null;
  registered: boolean;
  active: boolean;
}

/** All CBSE Class 10 subjects with their readiness status, plus whether this student has registered each. */
export async function loadSubjectCatalogue(supabase: SupabaseClient, studentId: string): Promise<SubjectCatalogueEntry[]> {
  const [{ data: subjects, error }, { data: goals }] = await Promise.all([
    supabase.from('subjects').select('id, name, slug, status, description, curricula!inner(board, class)').eq('curricula.board', 'CBSE').eq('curricula.class', '10'),
    supabase
      .from('learning_goals')
      .select('subject_id, activated_at, created_at')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('activated_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (error) throw error;
  const registeredIds = new Set((goals ?? []).map((g: any) => g.subject_id).filter(Boolean));
  const activeId = (goals ?? [])[0]?.subject_id ?? null;
  const order: SubjectStatus[] = ['ready', 'pilot', 'in_development', 'coming_soon'];
  return (subjects ?? [])
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: (s.status ?? 'ready') as SubjectStatus,
      description: s.description ?? null,
      registered: registeredIds.has(s.id),
      active: activeId === s.id,
    }))
    .sort((a: SubjectCatalogueEntry, b: SubjectCatalogueEntry) => order.indexOf(a.status) - order.indexOf(b.status) || a.name.localeCompare(b.name));
}

/**
 * Registers a subject for a student (idempotent) and optionally makes it the
 * active one. Throws 'subject_not_available' for coming-soon / in-development
 * subjects. The caller must pass a studentId derived from the authenticated
 * session, never one supplied by the client.
 */
export async function registerSubject(
  supabase: SupabaseClient,
  studentId: string,
  subjectId: string,
  options: { activate?: boolean; targetDate?: string | null } = {}
): Promise<void> {
  const { data: subject, error: subjErr } = await supabase.from('subjects').select('id, curriculum_id, status').eq('id', subjectId).single();
  if (subjErr || !subject) throw new Error('subject_not_found');
  if (!isUsableSubjectStatus(subject.status)) throw new Error('subject_not_available');

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('learning_goals')
    .select('id')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = { status: 'active' };
    if (options.activate) patch.activated_at = now;
    if (options.targetDate !== undefined) patch.target_date = options.targetDate;
    const { error } = await supabase.from('learning_goals').update(patch).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('learning_goals').insert({
    student_id: studentId,
    curriculum_id: subject.curriculum_id,
    subject_id: subjectId,
    target_date: options.targetDate ?? null,
    status: 'active',
    activated_at: options.activate ? now : new Date(Date.now() - 1000).toISOString(),
  });
  if (error) throw error;
}
