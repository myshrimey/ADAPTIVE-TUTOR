import type { SupabaseClient } from '@supabase/supabase-js';
import { publishedVersionForSubject } from '../curriculum-mgmt/store';

// Saved test reports (v49). Each finished diagnostic, quick quiz and mock/paper is saved twice:
//  - a STUDENT report (full question review) the student can reopen any time, and
//  - an ADULT report (short summary) for linked parents, tutors and centres. Students cannot read it.
// Everything in a report is a count, a date or text of the questions; it never describes the child and never predicts marks.

export type ReportKind = 'diagnostic' | 'skill_quiz' | 'mock';
export const REPORT_KIND_LABEL: Record<ReportKind, string> = { diagnostic: 'Diagnostic', skill_quiz: 'Quick quiz', mock: 'Mock / paper' };

export interface ReportItem {
  prompt: string;
  group: string; // chapter (mock) or skill name (diagnostic / quiz)
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answered: boolean;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
  marks?: number;
  pending?: boolean; // written answer waiting for handwritten marking
}

export interface ReportInput {
  kind: ReportKind;
  title: string;
  score: number;
  total: number;
  inMarks: boolean;
  items: ReportItem[];
  timeUsedSeconds?: number;
  autoSubmitted?: boolean;
  /** Extra plain sentence(s) from the caller, e.g. mock kind. */
  extraNotes?: string[];
}

export interface StudentReportData {
  items: ReportItem[];
  byGroup: { group: string; correct: number; total: number }[];
  timeUsedSeconds?: number;
  autoSubmitted?: boolean;
  pendingWritten: number;
  curriculum?: { id: string; label: string } | null;
}

export interface AdultReportData {
  correct: number;
  total: number;
  percent: number;
  inMarks: boolean;
  byGroup: { group: string; correct: number; total: number }[];
  practiseAgain: string[];
  curriculum?: { id: string; label: string } | null;
  wentWell: string[];
  unanswered: number;
  timeUsedSeconds?: number;
  autoSubmitted?: boolean;
  pendingWritten: number;
  notes: string[];
}

function groups(items: ReportItem[]): { group: string; correct: number; total: number }[] {
  const m = new Map<string, { correct: number; total: number }>();
  for (const it of items) {
    if (it.pending) continue;
    const w = it.marks ?? 1;
    const g = m.get(it.group) ?? { correct: 0, total: 0 };
    g.total += w;
    if (it.isCorrect) g.correct += w;
    m.set(it.group, g);
  }
  return [...m.entries()].map(([group, v]) => ({ group, ...v })).sort((a, b) => a.group.localeCompare(b.group));
}

export function buildStudentReport(input: ReportInput): StudentReportData {
  return {
    items: input.items,
    byGroup: groups(input.items),
    timeUsedSeconds: input.timeUsedSeconds,
    autoSubmitted: input.autoSubmitted,
    pendingWritten: input.items.filter((i) => i.pending).length,
  };
}

export function buildAdultReport(input: ReportInput): AdultReportData {
  const byGroup = groups(input.items);
  const counted = input.items.filter((i) => !i.pending);
  const pendingWritten = input.items.length - counted.length;
  const practiseAgain = byGroup.filter((g) => g.total > 0 && g.correct / g.total < 0.5).map((g) => g.group);
  const wentWell = byGroup.filter((g) => g.total > 0 && g.correct / g.total >= 0.8).map((g) => g.group);
  const notes: string[] = [];
  if (input.kind === 'diagnostic') notes.push('A diagnostic is a starting point. It helps Sahayak decide where to begin; it is not a grade.');
  if (counted.length < 6) notes.push(`This test had only ${counted.length} question${counted.length === 1 ? '' : 's'}, so it shows a small snapshot, not a full picture.`);
  if (input.autoSubmitted) notes.push('The timer ended before the student pressed submit, so unanswered questions were counted as unanswered.');
  if (pendingWritten > 0) notes.push(`${pendingWritten} written answer${pendingWritten === 1 ? ' is' : 's are'} waiting for handwritten marking and ${pendingWritten === 1 ? 'is' : 'are'} not in the score yet.`);
  for (const n of input.extraNotes ?? []) notes.push(n);
  notes.push('This report describes what happened in one test. It is not a prediction of board marks or rank.');
  return {
    correct: input.score,
    total: input.total,
    percent: input.total > 0 ? Math.round((input.score / input.total) * 100) : 0,
    inMarks: input.inMarks,
    byGroup,
    practiseAgain,
    wentWell,
    unanswered: counted.filter((i) => !i.answered).length,
    timeUsedSeconds: input.timeUsedSeconds,
    autoSubmitted: input.autoSubmitted,
    pendingWritten,
    notes,
  };
}

/** Saves both versions. Safe to call twice for the same test (it overwrites). Never throws: a report problem must not break a submitted test. */
export async function saveTestReports(
  service: SupabaseClient,
  p: { studentId: string; subjectId: string | null; sourceId: string; takenAt?: string; input: ReportInput }
): Promise<boolean> {
  try {
    const takenAt = p.takenAt ?? new Date().toISOString();
    const base = { student_id: p.studentId, kind: p.input.kind, source_id: p.sourceId, subject_id: p.subjectId, title: p.input.title, taken_at: takenAt, score: p.input.score, total: p.input.total, in_marks: p.input.inMarks };
    // v81: remember which published curriculum version was in force when this report was made (null when none is published). Stored inside the report so it works before any migration and old reports stay as they were.
    const cv = await publishedVersionForSubject(service, p.subjectId);
    const rows = [
      { ...base, audience: 'student', data: { ...buildStudentReport(p.input), curriculum: cv } },
      { ...base, audience: 'adult', data: { ...buildAdultReport(p.input), curriculum: cv } },
    ];
    const { error } = await service.from('test_reports').upsert(rows, { onConflict: 'student_id,kind,source_id,audience' });
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error('saveTestReports failed', err?.message);
    return false;
  }
}
