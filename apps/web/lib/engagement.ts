import type { SupabaseClient } from '@supabase/supabase-js';
import { loadCurriculum, loadEngagementSettings, skillIndex, type AIProvider } from '@adaptive-tutor/core';

/** Curriculum index + settings for the engagement engine. The student id always comes from the session, never from the request. */
export async function engineCtx(service: SupabaseClient, ai?: AIProvider) {
  const [curriculum, settings] = await Promise.all([loadCurriculum(service, 'CBSE', '10'), loadEngagementSettings(service)]);
  return { idx: skillIndex(curriculum), settings, ai, curriculum };
}
