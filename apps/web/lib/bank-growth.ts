import { after } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { createAIProvider, requestBankGrowth, runBankGrowth } from '@adaptive-tutor/core';

// Called when a learning session or diagnostic starts: owe the subject 50 more questions and write as many as the
// time allows AFTER the response has gone to the student (they never wait). Free-tier AI only; never blocks or fails the start.
export function kickBankGrowth(subjectId: string | null | undefined): void {
  if (!subjectId) return;
  try {
    after(async () => {
      try {
        const service = createServiceClient();
        await requestBankGrowth(service, subjectId);
        await runBankGrowth(service, createAIProvider({ tier: 'free' }), subjectId, 40_000);
      } catch (e: any) {
        console.error('bank growth failed', e?.message);
      }
    });
  } catch { /* outside a request: ignore */ }
}
