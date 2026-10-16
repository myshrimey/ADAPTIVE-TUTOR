import type { SupabaseClient } from '@supabase/supabase-js';

// Pre-session check-ins and longitudinal confidence (master prompt sec. 13-19).
//
// Design rules this file enforces:
//  - Self-reported context (mood, focus, confidence) is stored in its own
//    table and NEVER written into mastery_states — "context affects the
//    intervention; evidence determines the academic assessment".
//  - Confidence is reported as a trend (current / last / 7-day / 30-day
//    averages), not as a single "High/Moderate" label.
//  - Anything shown to a parent is derived only from stored rows, and the
//    wording is neutral and supportive — no labelling of the child.
//  - One tired or low-confidence session never lowers mastery; at most it
//    puts that session into a gentler "recovery" mode (easier start).

export type Mood = 'very_good' | 'good' | 'okay' | 'not_great' | 'tired' | 'stressed';
export type Focus = 'very_focused' | 'mostly_focused' | 'a_little_distracted' | 'very_distracted';
export type SessionGoal = 'learn' | 'practise' | 'revise' | 'fix_mistakes' | 'test_myself';

export const MOODS: Mood[] = ['very_good', 'good', 'okay', 'not_great', 'tired', 'stressed'];
export const FOCUS_LEVELS: Focus[] = ['very_focused', 'mostly_focused', 'a_little_distracted', 'very_distracted'];
export const SESSION_GOALS: SessionGoal[] = ['learn', 'practise', 'revise', 'fix_mistakes', 'test_myself'];
export const TIME_OPTIONS_MINUTES = [10, 20, 30, 45];

export interface CheckinInput {
  mood?: Mood | null;
  focus?: Focus | null;
  confidenceBefore?: number | null; // 0-10
  availableMinutes?: number | null;
  sessionGoal?: SessionGoal | null;
}

/**
 * Recovery mode: the student reports two or more signs that today is a harder
 * day than usual (low mood/energy, very low focus, very low confidence). It
 * only makes the session gentler — it does not touch stored mastery.
 */
export function evaluateRecoveryMode(input: CheckinInput): boolean {
  let signals = 0;
  if (input.mood === 'tired' || input.mood === 'stressed' || input.mood === 'not_great') signals++;
  if (input.focus === 'very_distracted') signals++;
  if (typeof input.confidenceBefore === 'number' && input.confidenceBefore <= 3) signals++;
  return signals >= 2;
}

function clampConfidence(v: unknown): number | null {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** Validates and stores a check-in for a session. studentId must come from the authenticated session. */
export async function recordCheckin(
  supabase: SupabaseClient,
  studentId: string,
  sessionId: string,
  skillId: string | null,
  input: CheckinInput
): Promise<{ recoveryMode: boolean }> {
  const clean: CheckinInput = {
    mood: oneOf(input.mood, MOODS),
    focus: oneOf(input.focus, FOCUS_LEVELS),
    confidenceBefore: clampConfidence(input.confidenceBefore),
    availableMinutes:
      typeof input.availableMinutes === 'number' && input.availableMinutes >= 1 && input.availableMinutes <= 240
        ? Math.round(input.availableMinutes)
        : null,
    sessionGoal: oneOf(input.sessionGoal, SESSION_GOALS),
  };
  const recoveryMode = evaluateRecoveryMode(clean);
  const { error } = await supabase.from('session_checkins').insert({
    student_id: studentId,
    session_id: sessionId,
    skill_id: skillId,
    mood: clean.mood,
    focus: clean.focus,
    confidence_before: clean.confidenceBefore,
    available_minutes: clean.availableMinutes,
    session_goal: clean.sessionGoal,
    recovery_mode: recoveryMode,
  });
  if (error) throw error;
  return { recoveryMode };
}

/** Stores the end-of-session confidence. RLS limits this to the caller's own check-in row. */
export async function recordConfidenceAfter(supabase: SupabaseClient, sessionId: string, confidenceAfter: number): Promise<void> {
  const value = clampConfidence(confidenceAfter);
  if (value === null) throw new Error('invalid_confidence');
  const { error } = await supabase
    .from('session_checkins')
    .update({ confidence_after: value, completed_at: new Date().toISOString() })
    .eq('session_id', sessionId);
  if (error) throw error;
}

export interface SessionCheckinSettings {
  recoveryMode: boolean;
  sessionGoal: SessionGoal | null;
  availableMinutes: number | null;
}

export async function getSessionCheckin(supabase: SupabaseClient, sessionId: string): Promise<SessionCheckinSettings | null> {
  const { data } = await supabase
    .from('session_checkins')
    .select('recovery_mode, session_goal, available_minutes')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (!data) return null;
  return { recoveryMode: !!data.recovery_mode, sessionGoal: data.session_goal ?? null, availableMinutes: data.available_minutes ?? null };
}

// ------------------------------------------------------------------ trends

export interface ConfidenceTrend {
  /** Number of check-ins with a confidence value. */
  count: number;
  current: number | null;
  lastSession: number | null; // the one before `current`
  avg7Days: number | null;
  avg30Days: number | null;
  direction: 'improving' | 'steady' | 'declining' | 'not_enough_data';
  /** Average (after - before) over sessions that have both; null if none. */
  avgChangeInSession: number | null;
  /** A neutral, data-backed sentence for parents, or null if there is nothing meaningful to say. */
  mismatchNote: string | null;
  /** Series for charting, oldest first. */
  series: { date: string; value: number }[];
  bySubject: { subjectId: string; subjectName: string; count: number; first: number; latest: number; avg: number; direction: ConfidenceTrend['direction'] }[];
}

const DAY = 24 * 60 * 60 * 1000;

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

function directionOf(values: number[]): ConfidenceTrend['direction'] {
  // values oldest -> newest. Needs at least 4 points: compare the newest 2 with the earlier ones.
  if (values.length < 4) return 'not_enough_data';
  const recent = mean(values.slice(-2)) as number;
  const earlier = mean(values.slice(0, -2)) as number;
  const diff = recent - earlier;
  if (diff >= 0.7) return 'improving';
  if (diff <= -0.7) return 'declining';
  return 'steady';
}

/** Longitudinal confidence for a student, built only from stored check-ins. */
export async function loadConfidenceTrend(supabase: SupabaseClient, studentId: string): Promise<ConfidenceTrend> {
  const { data: rows } = await supabase
    .from('session_checkins')
    .select('session_id, confidence_before, confidence_after, created_at, skills(topics(chapters(subjects(id, name))))')
    .eq('student_id', studentId)
    .not('confidence_before', 'is', null)
    .order('created_at', { ascending: true })
    .limit(500);

  const list = (rows ?? []).map((r: any) => ({
    sessionId: r.session_id as string | null,
    before: Number(r.confidence_before),
    after: r.confidence_after === null || r.confidence_after === undefined ? null : Number(r.confidence_after),
    at: new Date(r.created_at).getTime(),
    date: String(r.created_at).slice(0, 10),
    subject: r.skills?.topics?.chapters?.subjects ?? null,
  }));

  if (list.length === 0) {
    return { count: 0, current: null, lastSession: null, avg7Days: null, avg30Days: null, direction: 'not_enough_data', avgChangeInSession: null, mismatchNote: null, series: [], bySubject: [] };
  }

  const now = Date.now();
  const values = list.map((x) => x.before);
  const changes = list.filter((x) => x.after !== null).map((x) => (x.after as number) - x.before);

  const bySubjectMap = new Map<string, { name: string; vals: number[] }>();
  for (const x of list) {
    if (!x.subject?.id) continue;
    if (!bySubjectMap.has(x.subject.id)) bySubjectMap.set(x.subject.id, { name: x.subject.name, vals: [] });
    bySubjectMap.get(x.subject.id)!.vals.push(x.before);
  }

  return {
    count: list.length,
    current: values[values.length - 1],
    lastSession: values.length > 1 ? values[values.length - 2] : null,
    avg7Days: round1(mean(list.filter((x) => now - x.at <= 7 * DAY).map((x) => x.before))),
    avg30Days: round1(mean(list.filter((x) => now - x.at <= 30 * DAY).map((x) => x.before))),
    direction: directionOf(values),
    avgChangeInSession: round1(mean(changes)),
    mismatchNote: await buildMismatchNote(supabase, studentId, list.filter((x) => x.sessionId).slice(-8)),
    series: list.slice(-30).map((x) => ({ date: x.date, value: x.before })),
    bySubject: [...bySubjectMap.entries()].map(([subjectId, v]) => ({
      subjectId,
      subjectName: v.name,
      count: v.vals.length,
      first: v.vals[0],
      latest: v.vals[v.vals.length - 1],
      avg: round1(mean(v.vals)) as number,
      direction: directionOf(v.vals),
    })),
  };
}

/**
 * Compares what the student SAID about their confidence with how they actually
 * did without hints in the same session (sec. 16). Two separate signals, never
 * merged. Needs at least 3 sessions with 3+ independent attempts each, and
 * returns supportive wording only when a clear pattern exists.
 */
async function buildMismatchNote(
  supabase: SupabaseClient,
  studentId: string,
  recent: { sessionId: string | null; before: number }[]
): Promise<string | null> {
  const ids = recent.map((r) => r.sessionId).filter(Boolean) as string[];
  if (ids.length < 3) return null;
  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('session_id, is_correct, hints_used')
    .eq('student_id', studentId)
    .in('session_id', ids);
  const stats = new Map<string, { n: number; ok: number }>();
  for (const a of attempts ?? []) {
    if ((a as any).hints_used > 0) continue; // independent attempts only
    const s = stats.get((a as any).session_id) ?? { n: 0, ok: 0 };
    s.n++;
    if ((a as any).is_correct) s.ok++;
    stats.set((a as any).session_id, s);
  }
  let high = 0;
  let low = 0;
  let judged = 0;
  for (const r of recent) {
    const s = r.sessionId ? stats.get(r.sessionId) : undefined;
    if (!s || s.n < 3) continue;
    judged++;
    const acc = s.ok / s.n;
    if (r.before >= 8 && acc < 0.5) high++;
    if (r.before <= 3 && acc >= 0.75) low++;
  }
  if (judged < 3) return null;
  if (low >= 2) return 'In several sessions the student felt unsure but answered most questions correctly without hints — they may know more than they feel.';
  if (high >= 2) return 'In several sessions the student felt very confident but found the unaided questions harder — a few extra practice questions will help check understanding.';
  return null;
}
