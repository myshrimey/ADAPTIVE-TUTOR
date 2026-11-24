import type { AIProvider } from '@adaptive-tutor/core';
import { createAIProvider, recordActivityForStudent, getAccess, aiTierForPlan, tutorRepliesPerDay, assertTutorAllowance, recordAIAttempt, loadSettings } from '@adaptive-tutor/core';
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
  if (options.tutor) {
    // Daily limits are editable at /admin/pricing (settings); the built-in numbers are only the fallback.
    let limit = tutorRepliesPerDay(planCode);
    try {
      const st = await loadSettings(service);
      const v = tier === 'free' ? st.free_limits.tutor_replies_per_day : st.paid_limits.tutor_replies_per_day;
      if (Number.isFinite(v) && v >= 0) limit = v;
    } catch { /* keep fallback */ }
    await assertTutorAllowance(service, studentId, limit);
  }
  const inner = createAIProvider({ tier, service, studentId, onAttempt: recordAIAttempt(service, studentId, tier) });
  // v141: when EVERY provider fails for this student's request, the timeline gets one "AI request failed" event (feature name only; never the text).
  return {
    supportsImages: inner.supportsImages,
    complete: async (params) => {
      try { return await inner.complete(params); }
      catch (err: any) {
        if (/^(all_ai_providers_unavailable|no_ai_providers_configured|no_vision_provider)/.test(String(err?.message ?? ''))) {
          await recordActivityForStudent(service, studentId, { type: 'ai_failure', status: 'failed', meta: { feature: String(params.feature ?? 'unknown').slice(0, 30) } });
        }
        throw err;
      }
    },
  };
}
