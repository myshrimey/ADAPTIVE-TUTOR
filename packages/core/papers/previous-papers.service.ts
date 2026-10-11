import type { SupabaseClient } from '@supabase/supabase-js';

// A shared library of previous-year question papers students upload
// themselves (see migrations/0006_previous_papers.sql) — this module only
// handles the metadata row; the PDF bytes go straight from the browser into
// Supabase Storage (bucket 'papers'), never through this server code, so a
// large file upload never has to pass through a Next.js route handler.

export interface PreviousPaper {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  year: number | null;
  filePath: string;
  solutionFilePath: string | null;
  notes: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

function mapRow(r: any): PreviousPaper {
  return {
    id: r.id,
    subjectId: r.subject_id,
    subjectName: r.subjects?.name ?? '',
    title: r.title,
    year: r.year,
    filePath: r.file_path,
    solutionFilePath: r.solution_file_path,
    notes: r.notes,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  };
}

export async function listPreviousPapers(supabase: SupabaseClient, subjectId?: string): Promise<PreviousPaper[]> {
  let query = supabase
    .from('previous_papers')
    .select('id, subject_id, title, year, file_path, solution_file_path, notes, uploaded_by, created_at, subjects(name)')
    .order('year', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (subjectId) query = query.eq('subject_id', subjectId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function addPreviousPaper(
  supabase: SupabaseClient,
  params: {
    subjectId: string;
    uploadedBy: string;
    title: string;
    year?: number | null;
    filePath: string;
    solutionFilePath?: string | null;
    notes?: string | null;
  }
): Promise<PreviousPaper> {
  const { data, error } = await supabase
    .from('previous_papers')
    .insert({
      subject_id: params.subjectId,
      uploaded_by: params.uploadedBy,
      title: params.title,
      year: params.year ?? null,
      file_path: params.filePath,
      solution_file_path: params.solutionFilePath ?? null,
      notes: params.notes ?? null,
    })
    .select('id, subject_id, title, year, file_path, solution_file_path, notes, uploaded_by, created_at, subjects(name)')
    .single();
  if (error || !data) throw error ?? new Error('previous_paper_insert_failed');
  return mapRow(data);
}

export async function deletePreviousPaper(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('previous_papers').delete().eq('id', id);
  if (error) throw error;
}
