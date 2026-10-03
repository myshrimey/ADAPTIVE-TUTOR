import type { SupabaseClient } from '@supabase/supabase-js';
import type { EvidenceField } from './types';

// Updates a preference field from an observed signal using a simple exponential
// moving average, weighted more heavily while confidence/n_observations is low.
// Inputs must be observable learning signals ONLY — time-to-answer, hint
// requests, retry behavior, correction after an example vs. after an
// explanation. Never sentiment, tone, or anything resembling a mental-health
// or personality signal (see docs/architecture.md §5 and §16).
export function updateEvidence<T extends number>(
  current: EvidenceField<T>,
  observedValue: T,
  learningRate = 0.2
): EvidenceField<T> {
  const n = current.nObservations + 1;
  const value = (current.value * (1 - learningRate) + observedValue * learningRate) as T;
  const confidence = Math.min(1, current.confidence + (1 - current.confidence) * 0.1);
  return { value, confidence, nObservations: n };
}

// Persists updated preference_evidence for a student. Called by the orchestrator
// after each turn where an observable signal was available (Day 4+), never by
// the client directly — preferences are derived, not self-reported by the student.
export async function savePreferenceEvidence(
  supabase: SupabaseClient,
  studentId: string,
  evidence: Record<string, EvidenceField<unknown>>
): Promise<void> {
  const { error } = await supabase
    .from('learning_profiles')
    .update({ preference_evidence: evidence, updated_at: new Date().toISOString() })
    .eq('student_id', studentId);
  if (error) throw error;
}
