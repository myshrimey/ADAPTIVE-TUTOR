import type { AIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { FallbackAIProvider } from './fallback.provider';

// Builds the provider chain every real tutoring/diagnostic-summary call
// uses by default (tutor.orchestrator.ts, session-summary.service.ts,
// question-engine/selector.ts) — one place to add a rung rather than
// touching every call site. Stays free: every rung here is a free-tier
// provider or a second free-tier model on the one already configured, never
// a paid one (ClaudeProvider stays the deliberately-unimplemented stub it
// already was — see claude.provider.ts).
//
// Order matters: cheapest/fastest-to-fail-over first.
//   1. Gemini, the primary model (GEMINI_API_KEY) — unchanged default.
//   2. Gemini again, via Google's "flash-latest" alias — same key, no new
//      signup, but a different served model, so a capacity problem specific
//      to the pinned model doesn't take down this rung too.
//   3. Groq (GROQ_API_KEY, optional) — a different company's free tier
//      entirely, for when the problem is Google-side rather than
//      model-specific. Skipped silently if GROQ_API_KEY isn't set; the app
//      works fine with just Gemini, this is pure upside when configured.
// Every rung is tried in order on ANY failure (see fallback.provider.ts);
// only once all of them fail does the student see an error.
export function createDefaultAIProvider(): AIProvider {
  const chain: Array<{ name: string; provider: AIProvider }> = [];

  if (process.env.GEMINI_API_KEY) {
    chain.push({ name: 'gemini-primary', provider: new GeminiProvider(process.env.GEMINI_API_KEY) });
    chain.push({ name: 'gemini-flash-latest', provider: new GeminiProvider(process.env.GEMINI_API_KEY, 'gemini-flash-latest') });
  }
  if (process.env.GROQ_API_KEY) {
    chain.push({ name: 'groq', provider: new GroqProvider(process.env.GROQ_API_KEY) });
  }

  return new FallbackAIProvider(chain);
}
