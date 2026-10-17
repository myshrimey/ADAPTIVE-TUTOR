import type { SupabaseClient } from '@supabase/supabase-js';

// "What changed in the last 30 days" (master prompt §22): the last 30 days set against the 30
// before them, from real answers, sessions and timed papers. Every sentence is produced by a rule
// from numbers; a comparison is made only when both windows hold enough evidence, otherwise the
// report says so. It describes work done, never the child, and never predicts marks.

export const MIN_ANSWERS_PER_WINDOW = 10;
const DAY = 86400000;

export interface SubjectChange {
  subjectName: string;
  answers: number;
  prevAnswers: number;
  accuracyPercent: number | null;
  prevAccuracyPercent: number | null;
  hintRatePercent: number | null; // share of answers that needed at least one hint
  prevHintRatePercent: number | null;
  mockPercent: number | null; // average of whole-subject papers in the window
  prevMockPercent: number | null;
  statements: string[];
}

export interface ChangeReport {
  windowDays: number;
  sessions: number;
  prevSessions: number;
  answers: number;
  prevAnswers: number;
  subjects: SubjectChange[];
  headline: string[]; // 1-3 plain sentences across all subjects
  whatNext: string[];
  enoughToCompare: boolean;
}

interface Row { correct: boolean; hint: boolean; at: number }

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

/** Pure: builds the sentences for one subject from its two windows. Exported for tests. */
export function describeSubject(s: Omit<SubjectChange, 'statements'>): string[] {
  const out: string[] = [];
  const both = s.answers >= MIN_ANSWERS_PER_WINDOW && s.prevAnswers >= MIN_ANSWERS_PER_WINDOW;
  if (s.answers === 0 && s.prevAnswers === 0) {
    out.push('No practice recorded in either period.');
  } else if (s.answers === 0) {
    out.push('No practice in the last 30 days, although there was some in the 30 days before.');
  } else if (!both) {
    out.push(`Not enough answers in both periods to compare fairly (${s.answers} now, ${s.prevAnswers} before; at least ${MIN_ANSWERS_PER_WINDOW} in each are needed).`);
  } else {
    const d = (s.accuracyPercent as number) - (s.prevAccuracyPercent as number);
    if (Math.abs(d) < 5) out.push(`Answers were about as accurate as before (${s.accuracyPercent}% now, ${s.prevAccuracyPercent}% before).`);
    else if (d > 0) out.push(`Answers became more accurate: ${s.accuracyPercent}% correct now, up from ${s.prevAccuracyPercent}%.`);
    else out.push(`Accuracy dipped: ${s.accuracyPercent}% correct now, down from ${s.prevAccuracyPercent}%. This can happen when harder questions are reached.`);
    if (s.hintRatePercent !== null && s.prevHintRatePercent !== null) {
      const h = s.hintRatePercent - s.prevHintRatePercent;
      if (h <= -10) out.push(`Fewer answers needed hints (${s.hintRatePercent}% now, ${s.prevHintRatePercent}% before).`);
      else if (h >= 10) out.push(`More answers needed hints (${s.hintRatePercent}% now, ${s.prevHintRatePercent}% before), which is common on newer topics.`);
    }
  }
  if (s.mockPercent !== null && s.prevMockPercent !== null) {
    const m = s.mockPercent - s.prevMockPercent;
    out.push(`Timed papers averaged ${s.mockPercent}% (${m >= 0 ? '+' : ''}${m} points against the 30 days before).`);
  } else if (s.mockPercent !== null) {
    out.push(`Timed papers averaged ${s.mockPercent}% in the last 30 days (none in the 30 days before to compare with).`);
  }
  return out;
}

export function buildHeadline(subjects: SubjectChange[], sessions: number, prevSessions: number): { headline: string[]; whatNext: string[]; enough: boolean } {
  const headline: string[] = [];
  const whatNext: string[] = [];
  if (sessions === 0 && prevSessions === 0) {
    return { headline: ['No learning sessions in the last 60 days yet.'], whatNext: ['Start with a short session or a diagnostic so there is something to compare next month.'], enough: false };
  }
  headline.push(`${sessions} learning session${sessions === 1 ? '' : 's'} in the last 30 days, against ${prevSessions} in the 30 days before.`);
  const comparable = subjects.filter((s) => s.answers >= MIN_ANSWERS_PER_WINDOW && s.prevAnswers >= MIN_ANSWERS_PER_WINDOW);
  const up = comparable.filter((s) => (s.accuracyPercent as number) - (s.prevAccuracyPercent as number) >= 5).map((s) => s.subjectName);
  const down = comparable.filter((s) => (s.accuracyPercent as number) - (s.prevAccuracyPercent as number) <= -5).map((s) => s.subjectName);
  if (up.length) headline.push(`More accurate answers in ${up.join(', ')}.`);
  if (down.length) headline.push(`Accuracy dipped in ${down.join(', ')}.`);
  if (comparable.length === 0) headline.push('There are not yet enough answers in both periods to compare any subject fairly.');
  if (down.length) whatNext.push(`Revisit the weaker chapters in ${down[0]} with short sessions before moving on.`);
  const idle = subjects.filter((s) => s.answers === 0 && s.prevAnswers > 0).map((s) => s.subjectName);
  if (idle.length) whatNext.push(`Come back to ${idle.join(', ')}: there was no practice in the last 30 days.`);
  const thin = subjects.filter((s) => s.answers > 0 && s.answers < MIN_ANSWERS_PER_WINDOW).map((s) => s.subjectName);
  if (thin.length) whatNext.push(`A few more practice questions in ${thin.join(', ')} would make next month's comparison reliable.`);
  if (sessions < prevSessions && prevSessions > 0) whatNext.push('Study sessions were fewer than the month before; short, regular sessions help most.');
  if (whatNext.length === 0) whatNext.push('Keep the same routine and take a subject check to see how the whole subject is doing.');
  return { headline, whatNext, enough: comparable.length > 0 };
}

export async function buildChangeReport(supabase: SupabaseClient, studentId: string, now: Date = new Date()): Promise<ChangeReport> {
  const t1 = now.getTime();
  const t0 = t1 - 30 * DAY; // start of the recent window
  const tp = t1 - 60 * DAY; // start of the previous window
  const since = new Date(tp).toISOString();

  const [{ data: attempts }, { data: sessions }, { data: mocks }] = await Promise.all([
    supabase
      .from('question_attempts')
      .select('is_correct, hints_used, created_at, questions(skills(topics(chapters(subject_id, subjects(name)))))')
      .eq('student_id', studentId)
      .gte('created_at', since)
      .limit(5000),
    supabase.from('learning_sessions').select('started_at').eq('student_id', studentId).gte('started_at', since),
    supabase.from('mock_exams').select('subject_id, kind, score, total, submitted_at, subjects(name)').eq('student_id', studentId).eq('status', 'submitted').gte('submitted_at', since),
  ]);

  type Acc = { name: string; now: Row[]; prev: Row[]; mockNow: number[]; mockPrev: number[] };
  const by = new Map<string, Acc>();
  const slot = (id: string, name: string) => {
    if (!by.has(id)) by.set(id, { name, now: [], prev: [], mockNow: [], mockPrev: [] });
    return by.get(id)!;
  };
  for (const a of (attempts ?? []) as any[]) {
    const ch = a.questions?.skills?.topics?.chapters;
    if (!ch?.subject_id) continue;
    const at = new Date(a.created_at).getTime();
    const row: Row = { correct: !!a.is_correct, hint: (a.hints_used ?? 0) > 0, at };
    const acc = slot(ch.subject_id, ch.subjects?.name ?? 'Subject');
    (at >= t0 ? acc.now : acc.prev).push(row);
  }
  for (const m of (mocks ?? []) as any[]) {
    if (!m.total || (m.kind ?? 'full_mock') === 'chapter_check') continue; // whole-subject papers only
    const at = new Date(m.submitted_at).getTime();
    const acc = slot(m.subject_id, m.subjects?.name ?? 'Subject');
    const p = Math.round((Number(m.score) / Number(m.total)) * 100);
    (at >= t0 ? acc.mockNow : acc.mockPrev).push(p);
  }

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const subjects: SubjectChange[] = [...by.values()]
    .map((a) => {
      const base = {
        subjectName: a.name,
        answers: a.now.length,
        prevAnswers: a.prev.length,
        accuracyPercent: pct(a.now.filter((r) => r.correct).length, a.now.length),
        prevAccuracyPercent: pct(a.prev.filter((r) => r.correct).length, a.prev.length),
        hintRatePercent: pct(a.now.filter((r) => r.hint).length, a.now.length),
        prevHintRatePercent: pct(a.prev.filter((r) => r.hint).length, a.prev.length),
        mockPercent: avg(a.mockNow),
        prevMockPercent: avg(a.mockPrev),
      };
      return { ...base, statements: describeSubject(base) };
    })
    .sort((x, y) => x.subjectName.localeCompare(y.subjectName));

  const sessionsNow = (sessions ?? []).filter((s: any) => new Date(s.started_at).getTime() >= t0).length;
  const sessionsPrev = (sessions ?? []).length - sessionsNow;
  const h = buildHeadline(subjects, sessionsNow, sessionsPrev);
  return {
    windowDays: 30,
    sessions: sessionsNow,
    prevSessions: sessionsPrev,
    answers: subjects.reduce((a, s) => a + s.answers, 0),
    prevAnswers: subjects.reduce((a, s) => a + s.prevAnswers, 0),
    subjects,
    headline: h.headline,
    whatNext: h.whatNext,
    enoughToCompare: h.enough,
  };
}
