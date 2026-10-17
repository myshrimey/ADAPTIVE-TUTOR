import type { SupabaseClient } from '@supabase/supabase-js';
import { loadConfidenceTrend, type ConfidenceTrend } from '../checkins/checkin.service';
import { assessReadiness, summariseReadiness, type ReadinessAssessment } from '../readiness/readiness.service';
import { t as translate } from '../i18n/dictionary';
import { loadEngagement, type EngagementSummary } from '../engagement/engagement.service';
import { LIKELY_CAUSE_WORDING } from '../misconceptions/taxonomy';
import type { MisconceptionTag } from '../learner-model/types';

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
  // v34 (master prompt sec. 23, scoped down): how much of the syllabus has
  // actually been assessed, and how much evidence the estimate rests on.
  subjectStatus: 'ready' | 'pilot' | 'in_development' | 'coming_soon';
  skillsAssessed: number;
  skillsTotal: number;
  coveragePercent: number; // skillsAssessed / skillsTotal
  /**
   * How much data Sahayak has for this subject's numbers. This describes the
   * evidence, NOT the child: 'insufficient' = too little to say anything firm.
   */
  evidence: 'insufficient' | 'limited' | 'good';
  // v35: board-readiness band + the timed-mock results it used.
  readiness: ReadinessAssessment;
  mockCount: number;
  latestMockPercent: number | null;
  /** Where to put effort first (subject matrix, master prompt §23). Describes the plan, not the child. */
  priority: 'start' | 'focus' | 'steady' | 'insufficient';
  lastAssessmentAt: string | null;
  /** Patterns seen in wrong answers, in neutral words; low-confidence "likely causes", never findings. */
  likelyCauses: string[];
}

export interface AssessmentHistoryEntry {
  id: string;
  subjectName: string;
  kind: 'chapter_check' | 'subject_check' | 'full_mock' | 'board_style' | 'diagnostic';
  at: string;
  /** Count or marks, see inMarks. */
  score: number | null;
  total: number | null;
  percent: number | null;
  inMarks: boolean;
}

export interface ParentReport {
  studentName: string | null;
  confidence: ConfidenceTrend;
  subjects: ParentReportSubject[];
  readinessSummary: { assessed: number; onTrackOrAbove: number; total: number };
  engagement: EngagementSummary;
  /** Sessions that started gentler (after a hard day or a run of misses) in the last 30 days. */
  gentlerSessions: number;
  assessmentHistory: AssessmentHistoryEntry[];
  generatedAt: string;
}

export async function buildParentReport(supabase: SupabaseClient, studentId: string): Promise<ParentReport> {
  const [{ data: student }, { data: mockRows }, { data: masteryRows }, { data: attempts }, { data: sessions }, { data: skillRows }, { data: subjectRows }, { data: goalRows }, confidence] = await Promise.all([
    supabase.from('students').select('display_name').eq('id', studentId).single(),
    // Submitted mock exams (migration 0015). If that migration is not applied yet this just returns no rows.
    supabase.from('mock_exams').select('id, subject_id, kind, score, total, submitted_at').eq('student_id', studentId).eq('status', 'submitted').order('submitted_at', { ascending: false }).limit(60),
    supabase
      .from('mastery_states')
      .select('skill_id, score, band, skills(name, topics(chapters(subject_id, subjects(id, name))))')
      .eq('student_id', studentId),
    supabase
      .from('diagnostic_attempts')
      .select('id, status, completed_at, result, diagnostic_tests(subject_id, subjects(id, name))')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true }),
    supabase.from('learning_sessions').select('id, status').eq('student_id', studentId).eq('status', 'completed'),
    supabase.from('skills').select('id, topics(chapters(subject_id))'),
    supabase.from('subjects').select('id, name, status'),
    supabase.from('learning_goals').select('subject_id').eq('student_id', studentId).eq('status', 'active'),
    loadConfidenceTrend(supabase, studentId),
  ]);
  const [engagement, { data: recoveryRows }, { data: causeRows }] = await Promise.all([
    loadEngagement(supabase, studentId, 30),
    supabase.from('recovery_events').select('id').eq('student_id', studentId).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('misconceptions').select('tag, confidence, skills(topics(chapters(subject_id)))').eq('student_id', studentId).eq('resolved', false),
  ]);
  const causesBySubject = new Map<string, Map<string, number>>();
  for (const c of (causeRows ?? []) as any[]) {
    const sid = c.skills?.topics?.chapters?.subject_id;
    if (!sid || !(c.tag in LIKELY_CAUSE_WORDING)) continue;
    const m = causesBySubject.get(sid) ?? new Map<string, number>();
    m.set(c.tag, (m.get(c.tag) ?? 0) + 1);
    causesBySubject.set(sid, m);
  }

  const skillsTotalBySubject = new Map<string, number>();
  for (const sk of (skillRows ?? []) as any[]) {
    const sid = sk.topics?.chapters?.subject_id;
    if (sid) skillsTotalBySubject.set(sid, (skillsTotalBySubject.get(sid) ?? 0) + 1);
  }
  const subjectMeta = new Map((subjectRows ?? []).map((r: any) => [r.id, r]));

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
    const subjectId = row.skills?.topics?.chapters?.subject_id;
    const subjectName = row.skills?.topics?.chapters?.subjects?.name;
    const skillName = row.skills?.name;
    if (!subjectId || !skillName) continue;
    if (!bySubject.has(subjectId)) bySubject.set(subjectId, { subjectName: subjectName ?? 'Subject', scores: [], topics: [], needsPractice: [], lowest: null });
    const bucket = bySubject.get(subjectId)!;
    bucket.scores.push(Number(row.score));
    bucket.topics.push(skillName);
    if (row.band === 'needs_foundation' || row.band === 'emerging') bucket.needsPractice.push(skillName);
    if (!bucket.lowest || Number(row.score) < bucket.lowest.score) bucket.lowest = { name: skillName, score: Number(row.score) };
  }

  // Include every registered subject too, so a parent sees "diagnostic needed"
  // for a subject the child is registered in but hasn't started.
  const registeredIds = (goalRows ?? []).map((g: any) => g.subject_id).filter(Boolean) as string[];
  const allSubjectIds = new Set([...baselineBySubject.keys(), ...bySubject.keys(), ...registeredIds]);
  const subjects: ParentReportSubject[] = [...allSubjectIds].map((subjectId) => {
    const baseline = baselineBySubject.get(subjectId);
    const current = bySubject.get(subjectId);
    const currentAvg = current && current.scores.length > 0 ? current.scores.reduce((a, b) => a + b, 0) / current.scores.length : null;

    const meta: any = subjectMeta.get(subjectId);
    const skillsAssessed = current?.scores.length ?? 0;
    const skillsTotal = skillsTotalBySubject.get(subjectId) ?? 0;
    const coveragePercent = skillsTotal > 0 ? (skillsAssessed / skillsTotal) * 100 : 0;
    const evidence: ParentReportSubject['evidence'] =
      skillsAssessed < 3 || coveragePercent < 20 ? 'insufficient' : coveragePercent < 60 ? 'limited' : 'good';

    // Readiness counts papers that sample the whole subject; a one-chapter check does not.
    const mockPercents = ((mockRows ?? []) as any[])
      .filter((m) => m.subject_id === subjectId && m.total && (m.kind ?? 'full_mock') !== 'chapter_check')
      .map((m) => Math.round((Number(m.score) / Number(m.total)) * 100));
    const subjectStatus = (meta?.status ?? 'ready') as ParentReportSubject['subjectStatus'];
    const readiness = assessReadiness({ subjectStatus, skillsAssessed, skillsTotal, coveragePercent, evidence, masteryAvgPercent: currentAvg, mockPercents });

    const lastMock = ((mockRows ?? []) as any[]).find((m) => m.subject_id === subjectId)?.submitted_at ?? null;
    const lastDiag = ((attempts ?? []) as any[]).filter((a) => a.diagnostic_tests?.subject_id === subjectId).map((a) => a.completed_at).filter(Boolean).sort().pop() ?? null;
    const lastAssessmentAt = [lastMock, lastDiag].filter(Boolean).sort().pop() ?? null;
    const likelyCauses = [...(causesBySubject.get(subjectId)?.entries() ?? [])]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => LIKELY_CAUSE_WORDING[tag as MisconceptionTag]);

    return {
      readiness,
      priority: 'steady' as ParentReportSubject['priority'], // set below once every subject is known
      lastAssessmentAt,
      likelyCauses,
      mockCount: mockPercents.length,
      latestMockPercent: mockPercents[0] ?? null,
      subjectId,
      subjectName: meta?.name ?? baseline?.subjectName ?? current?.subjectName ?? 'Subject',
      subjectStatus: (meta?.status ?? 'ready') as ParentReportSubject['subjectStatus'],
      skillsAssessed,
      skillsTotal,
      coveragePercent,
      evidence,
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

  // Priority: subjects not started come first, then the lowest evidence-based bands.
  const bandRank: Record<string, number> = { building: 0, developing: 1, on_track: 2, well_prepared: 3 };
  const assessed = subjects.filter((x) => x.readiness.band !== 'insufficient_evidence');
  const lowest = assessed.length ? Math.min(...assessed.map((x) => bandRank[x.readiness.band])) : null;
  for (const x of subjects) {
    if (!x.hasBaseline && !x.hasCurrentMastery) x.priority = 'start';
    else if (x.readiness.band === 'insufficient_evidence') x.priority = 'insufficient';
    else if (assessed.length > 1 && bandRank[x.readiness.band] === lowest && lowest < 3) x.priority = 'focus';
    else if (assessed.length === 1 && bandRank[x.readiness.band] < 2) x.priority = 'focus';
    else x.priority = 'steady';
  }

  const nameById = new Map(subjects.map((x) => [x.subjectId, x.subjectName]));
  const history: AssessmentHistoryEntry[] = [];
  for (const m of (mockRows ?? []) as any[]) {
    history.push({
      id: m.id,
      subjectName: nameById.get(m.subject_id) ?? (subjectMeta.get(m.subject_id) as any)?.name ?? 'Subject',
      kind: (m.kind ?? 'full_mock') as AssessmentHistoryEntry['kind'],
      at: m.submitted_at,
      score: m.score ?? null,
      total: m.total ?? null,
      percent: m.total ? Math.round((Number(m.score) / Number(m.total)) * 100) : null,
      inMarks: m.kind === 'board_style',
    });
  }
  for (const a of (attempts ?? []) as any[]) {
    const r = a.result as { strengths?: string[]; weakSkills?: string[]; prerequisiteGaps?: string[] } | null;
    const correct = r?.strengths?.length ?? 0;
    const total = correct + (r?.weakSkills?.length ?? 0) + (r?.prerequisiteGaps?.length ?? 0);
    history.push({
      id: a.id,
      subjectName: a.diagnostic_tests?.subjects?.name ?? 'Subject',
      kind: 'diagnostic',
      at: a.completed_at,
      score: total ? correct : null,
      total: total || null,
      percent: total ? Math.round((correct / total) * 100) : null,
      inMarks: false,
    });
  }
  history.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    studentName: student?.display_name ?? null,
    engagement,
    gentlerSessions: (recoveryRows ?? []).length,
    assessmentHistory: history.slice(0, 15),
    confidence,
    subjects,
    readinessSummary: summariseReadiness(subjects.map((x) => x.readiness.band)),
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
    if (s.skillsTotal > 0) lines.push(`- Syllabus assessed so far: ${Math.round(s.coveragePercent)}% (${s.skillsAssessed} of ${s.skillsTotal} skills)${s.evidence === 'insufficient' ? ' — not enough evidence yet' : ''}`);
    lines.push(`- Preparation level: ${translate(`readiness.band.${s.readiness.band}` as any, 'en')}${s.mockCount > 0 ? ` (${s.mockCount} timed mock${s.mockCount === 1 ? '' : 's'}, latest ${s.latestMockPercent}%)` : ''}`);
    if (s.needsPractice.length) lines.push(`- Needs more practice: ${s.needsPractice.slice(0, 3).join(', ')}`);
    if (s.nextRecommendedSkillName) lines.push(`- Suggested next: ${s.nextRecommendedSkillName}`);
  }
  if (report.confidence.count > 0 && report.confidence.current !== null) {
    lines.push('');
    lines.push(`Confidence (self-reported, 0-10): latest ${report.confidence.current}${report.confidence.avg7Days !== null ? `, 7-day average ${report.confidence.avg7Days}` : ''}`);
  }
  lines.push('');
  lines.push('(This is a learning summary based on the evidence so far — not a prediction of board marks and not a guarantee of exam results.)');
  return lines.join('\n');
}
