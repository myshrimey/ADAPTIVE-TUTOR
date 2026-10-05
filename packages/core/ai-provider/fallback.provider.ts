import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';

// Tries each provider in order, falling through to the next on ANY failure —
// a timeout, a network error, or an overloaded/rate-limited response like
// the 503 "high demand" Gemini can return (packages/core/ai-provider/gemini.provider.ts
// already retries once on its own for that specific case; this is the next
// layer up, for when an entire provider is down, not just one flaky call).
// Different AI companies run on different infrastructure, so the odds of
// two being overloaded at the exact same moment are low — that's the whole
// point of stacking them rather than retrying the same one harder.
//
// Only throws once EVERY provider in the chain has failed, as
// `all_ai_providers_unavailable: ...` — apps/web/app/learn/page.tsx's
// friendlyError() recognizes that prefix and shows a message suggesting the
// student try again shortly, distinct from a single-provider hiccup.
export class FallbackAIProvider implements AIProvider {
  constructor(private chain: Array<{ name: string; provider: AIProvider }>) {
    if (chain.length === 0) {
      throw new Error('no_ai_providers_configured: set at least one of GEMINI_API_KEY, GROQ_API_KEY');
    }
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const failures: string[] = [];

    for (const { name, provider } of this.chain) {
      try {
        return await provider.complete(params);
      } catch (err: any) {
        failures.push(`${name}: ${err?.message ?? err}`);
      }
    }

    throw new Error(`all_ai_providers_unavailable: ${failures.join(' | ')}`);
  }
}
