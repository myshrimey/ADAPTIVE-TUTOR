import { getServiceClient } from '../db/service-client';

// Event types tracked to learning_events (docs/architecture.md, Analytics section).
export type LearningEventType =
  | 'signup'
  | 'onboarding_completed'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'session_started'
  | 'question_answered'
  | 'hint_requested'
  | 'lesson_completed'
  | 'mastery_changed'
  | 'session_completed'
  | 'return_session'
  | 'feedback_submitted';

// Writes via the service-role client — clients never insert learning_events
// directly (see packages/db/migrations/0002_rls_policies.sql). Never throws on
// failure to log: a broken analytics write should never break the product flow
// that triggered it, so this logs to stderr and swallows the error instead.
export async function logEvent(params: {
  studentId: string | null;
  sessionId?: string | null;
  eventType: LearningEventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from('learning_events').insert({
      student_id: params.studentId,
      session_id: params.sessionId ?? null,
      event_type: params.eventType,
      payload: params.payload ?? {},
    });
    if (error) throw error;
  } catch (err) {
    console.error('logEvent failed', params.eventType, err);
  }
}
