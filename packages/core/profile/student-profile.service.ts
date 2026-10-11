import type { SupabaseClient } from '@supabase/supabase-js';

// Extra profile info beyond the basic students/learning_profiles rows —
// school, family/contact details, and how the student did in classes 6-9
// before joining. All optional, filled in voluntarily on /profile. This is
// kept separate from the tutoring tables on purpose: nothing here is read
// by the diagnostic/mastery/orchestrator logic, it exists purely so the
// team can understand its users and tell Sahayak's story later (schools,
// investors, partners) with real numbers instead of guesses.

export interface StudentProfileDetails {
  studentId: string;
  schoolName: string | null;
  schoolBoard: string | null;
  schoolCity: string | null;
  schoolState: string | null;
  parentName: string | null;
  parentRelation: string | null;
  parentOccupation: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  siblingsCount: number | null;
  address: string | null;
  howHeardAboutUs: string | null;
  updatedAt: string | null;
}

export interface AcademicHistoryEntry {
  classLevel: 6 | 7 | 8 | 9;
  overallPercentage: number | null;
  board: string | null;
  remarks: string | null;
}

function mapDetails(studentId: string, r: any): StudentProfileDetails {
  return {
    studentId,
    schoolName: r?.school_name ?? null,
    schoolBoard: r?.school_board ?? null,
    schoolCity: r?.school_city ?? null,
    schoolState: r?.school_state ?? null,
    parentName: r?.parent_name ?? null,
    parentRelation: r?.parent_relation ?? null,
    parentOccupation: r?.parent_occupation ?? null,
    parentEmail: r?.parent_email ?? null,
    parentPhone: r?.parent_phone ?? null,
    siblingsCount: r?.siblings_count ?? null,
    address: r?.address ?? null,
    howHeardAboutUs: r?.how_heard_about_us ?? null,
    updatedAt: r?.updated_at ?? null,
  };
}

export async function getStudentProfileDetails(supabase: SupabaseClient, studentId: string): Promise<StudentProfileDetails> {
  const { data, error } = await supabase
    .from('student_profile_details')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return mapDetails(studentId, data);
}

export async function upsertStudentProfileDetails(
  supabase: SupabaseClient,
  studentId: string,
  fields: Partial<Omit<StudentProfileDetails, 'studentId' | 'updatedAt'>>
): Promise<StudentProfileDetails> {
  const row = {
    student_id: studentId,
    school_name: fields.schoolName ?? null,
    school_board: fields.schoolBoard ?? null,
    school_city: fields.schoolCity ?? null,
    school_state: fields.schoolState ?? null,
    parent_name: fields.parentName ?? null,
    parent_relation: fields.parentRelation ?? null,
    parent_occupation: fields.parentOccupation ?? null,
    parent_email: fields.parentEmail ?? null,
    parent_phone: fields.parentPhone ?? null,
    siblings_count: fields.siblingsCount ?? null,
    address: fields.address ?? null,
    how_heard_about_us: fields.howHeardAboutUs ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('student_profile_details')
    .upsert(row, { onConflict: 'student_id' })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('profile_upsert_failed');
  return mapDetails(studentId, data);
}

export async function listAcademicHistory(supabase: SupabaseClient, studentId: string): Promise<AcademicHistoryEntry[]> {
  const { data, error } = await supabase
    .from('student_academic_history')
    .select('class_level, overall_percentage, board, remarks')
    .eq('student_id', studentId)
    .order('class_level', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    classLevel: r.class_level,
    overallPercentage: r.overall_percentage === null ? null : Number(r.overall_percentage),
    board: r.board,
    remarks: r.remarks,
  }));
}

// Replaces the whole set in one go — the /profile form submits all 4 class
// rows (some possibly blank) together rather than editing them one at a time.
export async function upsertAcademicHistory(supabase: SupabaseClient, studentId: string, entries: AcademicHistoryEntry[]): Promise<void> {
  const rows = entries
    .filter((e) => e.overallPercentage !== null || e.board || e.remarks)
    .map((e) => ({
      student_id: studentId,
      class_level: e.classLevel,
      overall_percentage: e.overallPercentage,
      board: e.board ?? null,
      remarks: e.remarks ?? null,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('student_academic_history').upsert(rows, { onConflict: 'student_id,class_level' });
  if (error) throw error;
}
