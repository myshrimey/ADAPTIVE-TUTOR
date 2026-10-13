import type { SupabaseClient } from '@supabase/supabase-js';

// Parent-facing progress summary (brief Section 9). Built entirely from data
// that already exists — no invented improvement percentages, no guaranteed
// outcomes. Where the data isn't rich enough yet to support a real
// comparison, the function says so explicitly (`hasEnoughDataForComparison:
// false`) rather than computing something that would look like a score but
// isn't one.
//
// What "diagnostic baseline" vs "current mastery" means here, concretely:
// - Baseline = the result recorded at the moment a subject's diagnostic test
//   was completed (diagnostic_attempts.result, which seedMasteryFromDiagnostic
//   also used to initialize mastery_states) — i.e. where the student started.
// - Current = live mastery_states for that subject's skills right now.
// A subject only gets a baseline-vs-current comparison if it has a completed
// diagnostic attempt AND at least one mastery_states row — otherwise we show
// the baseline alone (or nothing) plus a next recommended step, never a
// fabricated "improvement."

export interface ParentReportSubject {
  subjectId: string;
  subjectName: string;
  hasBaseline: boolean;
  baselineAvgPercent: number | null; // from the diagnostic's own per-skill correctness, at completion time
  hasCurrentMastery: boolean;
  currentAvgPercent: number | null; // live average of mastery_states for this subject's skills
  hasEnoughDataForComparison: boolean; // true only if both of the above are present
  topicsStudied: string[]; // skill names touched (mastery_states exists for them)
  needsPractice: string[]; // skill names at band 'needs_foundation' or 'emerging'
  nextRecommendedSkillName: string | null;
  sessionsCompleted: number;
}

export interface ParentReport {
  studentName: string | null;
  subjects: ParentReportSubject[];
  generatedAt: string;
}

export async function buildParentReport(supabase: SupabaseClient, studentId: string): Promise<ParentReport> {
  const [{ data: student }, { data: masteryRows }, { data: attempts }, { data: sessions }] = await Promise.all([
    supabase.from('students').select('display_name').eq('id', studentId).single(),
    supabase
      .from('mastery_states')
      .select('skill_id, score, band, skills(name, chapters(subject_id, subjects(id, name)))')
      .eq('student_id', studentId),
    supabase
      .from('diagnostic_attempts')
      .select('id, status, completed_at, result, diagnostic_tests(subject_id, subjects(id, name))')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true }),
    supabase.from('learning_sessions').select('id, status').eq('student_id', studentId).eq('status', 'completed'),
  ]);

  // One baseline per subject — the FIRST completed diagnostic for that
  // subject (a retake's result is more like "current", not the original
  // starting point).
  const baselineBySubject = new Map<string, { subjectName: string; avgPercent: number }>();
  for (const a of (attempts ?? []) as any[]) {
    const subjectId = a.diagnostic_tests?.subject_id;
    const subjectName = a.diagnostic_tests?.subjects?.name;
    if (!subjectId || baselineBySubject.has(subjectId)) continue;
    const result = a.result as { strengths?: string[]; weakSkills?: string[]; prerequisiteGaps?: string[] } | null;
    const correct = result?.strengths?.length ?? 0;
    const incorrect = (result?.weakSkills?.length ?? 0) + (result?.prerequisiteGaps?.length ?? 0);
    const total = correct + incorrect;
    if (total === 0) continue;
    baselineBySubject.set(subjectId, { subjectName: subjectName ?? 'Subject', avgPercent: (correct / total) * 100 });
  }

  // Group live mastery by subject.
  const bySubject = new Map<
    string,
    { subjectName: string; scores: number[]; topics: string[]; needsPractice: string[]; lowest: { name: string; score: number } | null }
  >();
  for (const row of (masteryRows ?? []) as any[]) {
    const subjectId = row.skills?.chapters?.subject_id;
    const subjectName = row.skills?.chapters?.subjects?.name;
    const skillName = row.skills?.name;
    if (!subjectId || !skillName) continue;
    if (!bySubject.has(subjectId)) bySubject.set(subjectId, { subjectName: subjectName ?? 'Subject', scores: [], topics: [], needsPractice: [], lowest: null });
    const bucket = bySubject.get(subjectId)!;
    bucket.scores.push(Number(row.score));
    bucket.topics.push(skillName);
    if (row.band === 'needs_foundation' || row.band === 'emerging') bucket.needsPractice.push(skillName);
    if (!bucket.lowest || Number(row.score) < bucket.lowest.score) bucket.lowest = { name: skillName, score: Number(row.score) };
  }

  const allSubjectIds = new Set([...baselineBySubject.keys(), ...bySubject.keys()]);
  const subjects: ParentReportSubject[] = [...allSubjectIds].map((subjectId) => {
    const baseline = baselineBySubject.get(subjectId);
    const current = bySubject.get(subjectId);
    const currentAvg = current && current.scores.length > 0 ? current.scores.reduce((a, b) => a + b, 0) / current.scores.length : null;

    return {
      subjectId,
      subjectName: baseline?.subjectName ?? current?.subjectName ?? 'Subject',
      hasBaseline: !!baseline,
      baselineAvgPercent: baseline?.avgPercent ?? null,
      hasCurrentMastery: currentAvg !== null,
      currentAvgPercent: currentAvg,
      hasEnoughDataForComparison: !!baseline && currentAvg !== null,
      topicsStudied: current?.topics ?? [],
      needsPractice: current?.needsPractice ?? [],
      nextRecommendedSkillName: current?.lowest?.name ?? null,
      sessionsCompleted: sessions?.length ?? 0,
    };
  });

  return {
    studentName: student?.display_name ?? null,
    subjects,
    generatedAt: new Date().toISOString(),
  };
}

/** Plain-text summary suitable for a wa.me manual share link — no automated WhatsApp API involved. */
export function formatReportForWhatsApp(report: ParentReport): string {
  const lines: string[] = [];
  lines.push(`Sahayak progress summary${report.studentName ? ` for ${report.studentName}` : ''}:`);
  for (const s of report.subjects) {
    lines.push('');
    lines.push(`${s.subjectName}:`);
    if (s.hasEnoughDataForComparison) {
      lines.push(`- Started at ~${Math.round(s.baselineAvgPercent!)}%, now at ~${Math.round(s.currentAvgPercent!)}% mastery`);
    } else if (s.hasCurrentMastery) {
      lines.push(`- Currently ~${Math.round(s.currentAvgPercent!)}% mastery (no diagnostic baseline on record)`);
    } else if (s.hasBaseline) {
      lines.push(`- Diagnostic baseline ~${Math.round(s.baselineAvgPercent!)}% — not enough learning sessions yet for a current comparison`);
    } else {
      lines.push('- Not started yet');
    }
    if (s.needsPractice.length) lines.push(`- Needs more practice: ${s.needsPractice.slice(0, 3).join(', ')}`);
    if (s.nextRecommendedSkillName) lines.push(`- Suggested next: ${s.nextRecommendedSkillName}`);
  }
  lines.push('');
  lines.push('(This is a learning summary, not a guarantee of exam results.)');
  return lines.join('\n');
}
