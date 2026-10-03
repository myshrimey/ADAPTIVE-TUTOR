import type { SupabaseClient } from '@supabase/supabase-js';
import type { MasteryComponents, SkillMastery } from '../learner-model/types';
import { computeMasteryScore, bandForScore, RETENTION_DEFAULT_SCORE } from './types';
import { logEvent } from '../analytics/events';

const RECENT_WINDOW = 10;
const APPLICATION_DIFFICULTY_THRESHOLD = 4; // difficulty>=4 treated as "applied" for the MVP — see note below
const RETENTION_GAP_DAYS = 3;

interface AttemptRow {
  is_correct: boolean;
  hints_used: number;
  created_at: string;
  questions: { difficulty: number };
}

/**
 * Recomputes a student's mastery for one skill from their question_attempts
 * history and persists it to mastery_states. This is the ONLY place the
 * mastery formula (docs/architecture.md §7) is evaluated against real data —
 * component scores are stored separately so the formula/weights can change
 * later without losing history (see packages/core/mastery/types.ts).
 *
 * Called by the orchestrator (Day 4) right after a question is graded.
 */
export async function updateMastery(supabase: SupabaseClient, studentId: string, skillId: string): Promise<SkillMastery> {
  const { data: previous } = await supabase.from('mastery_states').select('band').eq('student_id', studentId).eq('skill_id', skillId).maybeSingle();

  const { data: attempts, error } = await supabase
    .from('question_attempts')
    .select('is_correct, hints_used, created_at, questions!inner(difficulty, skill_id)')
    .eq('student_id', studentId)
    .eq('questions.skill_id', skillId)
    .order('created_at', { ascending: false })
    .limit(50); // enough history for the MVP's windows without unbounded growth
  if (error) throw error;

  const rows = (attempts ?? []) as unknown as AttemptRow[];
  const components = computeComponents(rows);
  const score = computeMasteryScore(components);
  const band = bandForScore(score);

  const { error: upsertErr } = await supabase.from('mastery_states').upsert(
    { student_id: studentId, skill_id: skillId, score, band, component_scores: components, updated_at: new Date().toISOString() },
    { onConflict: 'student_id,skill_id' }
  );
  if (upsertErr) throw upsertErr;

  await logEvent({ studentId, eventType: 'mastery_changed', payload: { skillId, score, band } });

  // A skill crossing into 'strong' or 'mastered' for the first time is the
  // closest MVP proxy for "lesson_completed" (docs/architecture.md,
  // Analytics section) — there's no separate lesson/unit concept in this
  // schema, so the skill itself is the unit of "completed".
  const crossedIntoStrong = (band === 'strong' || band === 'mastered') && previous?.band !== 'strong' && previous?.band !== 'mastered';
  if (crossedIntoStrong) {
    await logEvent({ studentId, eventType: 'lesson_completed', payload: { skillId, score, band } });
  }

  return { skillId, score, band, components };
}

function computeComponents(rows: AttemptRow[]): MasteryComponents {
  if (rows.length === 0) {
    return { recentAccuracy: 0, applicationPerformance: 0, consistency: 0, independentPerformance: 0, retention: RETENTION_DEFAULT_SCORE };
  }

  const recent = rows.slice(0, RECENT_WINDOW);
  const recentAccuracy = accuracyPct(recent);

  // MVP simplification: the schema doesn't yet tag questions as "applied" vs.
  // "rote" (that's a Day 5+ question-metadata refinement), so difficulty >= 4
  // is used as a proxy for applied/word-problem style questions. Revisit once
  // question_type/tags carry that distinction directly.
  const applied = rows.filter((r) => r.questions.difficulty >= APPLICATION_DIFFICULTY_THRESHOLD);
  const applicationPerformance = applied.length ? accuracyPct(applied) : recentAccuracy;

  const consistency = consistencyScore(recent);

  const independent = rows.filter((r) => r.hints_used === 0);
  const independentPerformance = independent.length ? accuracyPct(independent) : 0;

  const retention = retentionScore(rows);

  return { recentAccuracy, applicationPerformance, consistency, independentPerformance, retention };
}

function accuracyPct(rows: AttemptRow[]): number {
  return (rows.filter((r) => r.is_correct).length / rows.length) * 100;
}

/** Low variance in recent correctness (not oscillating right/wrong) scores higher. */
function consistencyScore(recent: AttemptRow[]): number {
  if (recent.length < 2) return 100; // not enough data to call it inconsistent
  const values: number[] = recent.map((r) => (r.is_correct ? 1 : 0));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  // variance maxes out at 0.25 for a 0/1 series; map [0, 0.25] -> [100, 0]
  return Math.max(0, 100 - variance * 400);
}

/**
 * Accuracy on attempts that followed a >=3-day gap since the previous attempt
 * on this skill. Falls back to RETENTION_DEFAULT_SCORE when there isn't yet a
 * spaced pair to measure — see the comment on RETENTION_DEFAULT_SCORE in types.ts.
 */
function retentionScore(rowsDescending: AttemptRow[]): number {
  const rows = [...rowsDescending].reverse(); // ascending by time
  const spacedAttempts: AttemptRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const gapMs = new Date(rows[i].created_at).getTime() - new Date(rows[i - 1].created_at).getTime();
    if (gapMs >= RETENTION_GAP_DAYS * 24 * 60 * 60 * 1000) {
      spacedAttempts.push(rows[i]);
    }
  }
  return spacedAttempts.length ? accuracyPct(spacedAttempts) : RETENTION_DEFAULT_SCORE;
}
