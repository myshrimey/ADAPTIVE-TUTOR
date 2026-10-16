import type { AIProvider } from '@adaptive-tutor/core';
import { createAIProvider, getAccess, aiTierForPlan, tutorRepliesPerDay, assertTutorAllowance, recordAIAttempt } from '@adaptive-tutor/core';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * Builds the AI provider for ONE student's request.
 *   - Free-plan students (and anyone with no active plan) get free-tier AI models only.
 *   - Paid students get the same free models first, with the paid models as backup.
 *   - Every attempt is written to the usage/cost log (tokens and timing only; never the text).
 *   - With { tutor: true } it first checks the student's daily allowance of AI tutor replies
 *     and throws 'daily_ai_limit' when it is used up (nothing is sent to the AI in that case).
 * The student id must come from the signed-in session, never from the request body.
 */
export async function aiForStudent(studentId: string, options: { tutor?: boolean } = {}): Promise<AIProvider> {
  const service = createServiceClient();
  const access = await getAccess(service, studentId);
  const planCode = access.status === 'active' ? access.planCode : 'free';
  const tier = aiTierForPlan(planCode);
  if (options.tutor) await assertTutorAllowance(service, studentId, tutorRepliesPerDay(planCode));
  return createAIProvider({ tier, onAttempt: recordAIAttempt(service, studentId, tier) });
}
