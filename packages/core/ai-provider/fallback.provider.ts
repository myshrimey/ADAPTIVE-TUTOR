import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';
import type { AIAttempt } from './usage';

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
//
// v37: every attempt (success or failure) is reported to `onAttempt` for the
// usage/cost log. Reporting never changes the outcome of the call.
export class FallbackAIProvider implements AIProvider {
  constructor(
    private chain: Array<{ name: string; provider: AIProvider }>,
    private onAttempt?: (attempt: AIAttempt) => Promise<void> | void
  ) {
    if (chain.length === 0) {
      throw new Error('no_ai_providers_configured: set at least one of GEMINI_API_KEY, GROQ_API_KEY');
    }
  }

  private async report(a: AIAttempt): Promise<void> {
    if (!this.onAttempt) return;
    try {
      await this.onAttempt(a);
    } catch {
      /* logging must never break a turn */
    }
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const failures: string[] = [];
    const feature = params.feature ?? 'other';

    for (const { name, provider } of this.chain) {
      const started = Date.now();
      try {
        const result = await provider.complete(params);
        await this.report({
          provider: name,
          feature,
          ok: true,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          latencyMs: Date.now() - started,
        });
        return result;
      } catch (err: any) {
        const message = String(err?.message ?? err);
        failures.push(`${name}: ${message}`);
        await this.report({ provider: name, feature, ok: false, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started, error: message });
      }
    }

    throw new Error(`all_ai_providers_unavailable: ${failures.join(' | ')}`);
  }
}
