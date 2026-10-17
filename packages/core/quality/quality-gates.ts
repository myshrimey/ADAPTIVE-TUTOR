import type { SupabaseClient } from '@supabase/supabase-js';

// The ten quality gates a subject must pass before it may be called "ready" (master prompt §36).
// Some gates can only be judged by a person (a teacher, a real family), so the founder signs
// each one off. The page also shows computed evidence next to the gates it can inform. Evidence
// never signs a gate by itself, and nothing here claims a subject is ready automatically.
export const QUALITY_GATES: { gate: number; title: string; how: string }[] = [
  { gate: 1, title: 'Official syllabus mapped', how: 'Chapters and skills match the current official CBSE Class 10 syllabus (cbseacademic.nic.in).' },
  { gate: 2, title: 'Teacher reviewed questions and answer keys', how: 'A subject teacher has checked the questions, keys and explanations; bad ones are rejected.' },
  { gate: 3, title: 'Diagnostic gives sensible results', how: 'Tried on real students; the result matches what their teacher or parent expects.' },
  { gate: 4, title: 'Results persist', how: 'A result survives page refresh, sign-out and sign-in.' },
  { gate: 5, title: 'Mastery updates correctly', how: 'After practice the mastery shown moves in the right direction and by a sensible amount.' },
  { gate: 6, title: 'Parent report matches the evidence', how: 'Every statement on the report can be traced to what the student actually did.' },
  { gate: 7, title: 'Two-account privacy test passed', how: 'Signed in as student A, student B\'s data is not visible anywhere.' },
  { gate: 8, title: 'Parent and student finish unaided', how: 'A real parent and student complete the whole flow without help.' },
  { gate: 9, title: 'Access grant and revoke works', how: 'The founder can give and remove access for a student and the app obeys it.' },
  { gate: 10, title: 'No critical errors', how: 'No unresolved critical error was seen in a full trial of this subject.' },
];

export interface GateRow { gate: number; title: string; how: string; passed: boolean; note: string | null; signedBy: string | null; updatedAt: string | null }
export interface SubjectEvidence {
  questionsTotal: number;
  verified: number;
  needsReview: number;
  rejected: number;
  completedDiagnostics: number;
  teacherReviews: number;
  metadataMarksSet: number;
}
export interface SubjectGateReport { subjectId: string; slug: string; name: string; status: string; gates: GateRow[]; passedCount: number; allPassed: boolean; evidence: SubjectEvidence }

/** Builds the gate report for every subject. Service client only (the sign-off table has no public policy). */
export async function loadGateReports(service: SupabaseClient): Promise<SubjectGateReport[]> {
  const { data: subjects } = await service.from('subjects').select('id, slug, name, status').order('name');
  const { data: signoffs } = await service.from('subject_gate_signoffs').select('subject_id, gate, passed, note, signed_by, updated_at');
  const sMap = new Map<string, any>();
  for (const s of signoffs ?? []) sMap.set(`${s.subject_id}:${s.gate}`, s);

  const reports: SubjectGateReport[] = [];
  for (const sub of subjects ?? []) {
    const evidence = await subjectEvidence(service, sub.id);
    const gates: GateRow[] = QUALITY_GATES.map((g) => {
      const row = sMap.get(`${sub.id}:${g.gate}`);
      return { ...g, passed: !!row?.passed, note: row?.note ?? null, signedBy: row?.signed_by ?? null, updatedAt: row?.updated_at ?? null };
    });
    const passedCount = gates.filter((g) => g.passed).length;
    reports.push({ subjectId: sub.id, slug: sub.slug, name: sub.name, status: sub.status, gates, passedCount, allPassed: passedCount === QUALITY_GATES.length, evidence });
  }
  return reports;
}

async function subjectEvidence(service: SupabaseClient, subjectId: string): Promise<SubjectEvidence> {
  const empty: SubjectEvidence = { questionsTotal: 0, verified: 0, needsReview: 0, rejected: 0, completedDiagnostics: 0, teacherReviews: 0, metadataMarksSet: 0 };
  const { data: chapters } = await service.from('chapters').select('id').eq('subject_id', subjectId);
  const chapterIds = (chapters ?? []).map((c: any) => c.id);
  if (!chapterIds.length) return empty;
  const { data: topics } = await service.from('topics').select('id').in('chapter_id', chapterIds);
  const topicIds = (topics ?? []).map((t: any) => t.id);
  if (!topicIds.length) return empty;
  const { data: skills } = await service.from('skills').select('id').in('topic_id', topicIds);
  const skillIds = (skills ?? []).map((s: any) => s.id);
  if (!skillIds.length) return empty;

  const ev = { ...empty };
  const ids: string[] = [];
  // Count in pages: the bank can be ~1000 rows per subject and the API caps a single read.
  for (let from = 0; ; from += 1000) {
    const { data } = await service.from('diagnostic_questions').select('id, content_status, marks').in('skill_id', skillIds).range(from, from + 999);
    for (const q of data ?? []) {
      ev.questionsTotal++;
      ids.push(q.id);
      if (q.content_status === 'verified') ev.verified++;
      else if (q.content_status === 'rejected') ev.rejected++;
      else ev.needsReview++;
      if (q.marks != null) ev.metadataMarksSet++;
    }
    if (!data || data.length < 1000) break;
  }
  const { data: tests } = await service.from('diagnostic_tests').select('id').eq('subject_id', subjectId);
  const testIds = (tests ?? []).map((t: any) => t.id);
  if (testIds.length) {
    const { count: diagCount } = await service.from('diagnostic_attempts').select('id', { count: 'exact', head: true }).in('diagnostic_test_id', testIds).eq('status', 'completed');
    ev.completedDiagnostics = diagCount ?? 0;
  }
  for (let i = 0; i < ids.length; i += 300) {
    const { count } = await service.from('content_reviews').select('id', { count: 'exact', head: true }).eq('item_table', 'diagnostic_questions').in('item_id', ids.slice(i, i + 300));
    ev.teacherReviews += count ?? 0;
  }
  return ev;
}
