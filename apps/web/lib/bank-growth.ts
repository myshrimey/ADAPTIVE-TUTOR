import { after } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { createAIProvider, recordAIAttempt, requestBankGrowth, runBankGrowth, DIAGNOSTIC_BANK_TARGET } from '@adaptive-tutor/core';

// Called when a learning session or diagnostic starts: owe the subject 50 more questions and write as many as the
// time allows AFTER the response has gone to the student (they never wait). Free-tier AI only; never blocks or fails the start.
export function kickBankGrowth(subjectId: string | null | undefined): void {
  if (!subjectId) return;
  try {
    after(async () => {
      try {
        const service = createServiceClient();
        await requestBankGrowth(service, subjectId);
        const ai = createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') });
        await runBankGrowth(service, ai, subjectId, 20_000);
        // v60: and keep every subject's diagnostic bank moving toward the 1,000 floor.
        await runBankGrowth(service, ai, subjectId, 20_000, { fillDiagnosticTo: DIAGNOSTIC_BANK_TARGET });
      } catch (e: any) {
        console.error('bank growth failed', e?.message);
      }
    });
  } catch { /* outside a request: ignore */ }
}
