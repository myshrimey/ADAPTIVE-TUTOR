import type { AIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { OpenAIProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';
import { FallbackAIProvider } from './fallback.provider';
import { freeProviderNames, type AIAttempt } from './usage';
import type { AITier } from '../plans/plans';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GatewayAIProvider, supabaseGatewayDeps } from '../ai-gateway/gateway';

export interface CreateAIProviderOptions {
  /**
   * 'free'  = free-tier providers only (never a provider that bills per use) — used for the free plan.
   * 'paid'  = the whole chain: free providers first, paid providers as backup so a paid student's
   *           lesson does not stop when a free service is busy. (Default.)
   */
  tier?: AITier;
  /** Called for every attempt, for the usage/cost log. */
  onAttempt?: (attempt: AIAttempt) => Promise<void> | void;
  /**
   * v55b: when given, the request goes through the AI GATEWAY (registry, routing, quota, budget). The old key-by-key chain below is only a safety net
   * for when the registry cannot be read (for example migration 0032 has not been run).
   */
  service?: SupabaseClient;
  studentId?: string | null;
}

export function createAIProvider(options: CreateAIProviderOptions = {}): AIProvider {
  if (options.service) {
    const legacyOpts = { tier: options.tier, onAttempt: options.onAttempt };
    return new GatewayAIProvider({ deps: supabaseGatewayDeps(options.service), studentId: options.studentId ?? null, tier: options.tier === 'free' ? 'free' : 'paid', onAttempt: options.onAttempt, legacy: () => createLegacyChain(legacyOpts) });
  }
  return createLegacyChain(options);
}

function createLegacyChain(options: CreateAIProviderOptions): AIProvider {
  const chain: Array<{ name: string; provider: AIProvider }> = [];

  if (process.env.GEMINI_API_KEY) {
    chain.push({ name: 'gemini', provider: new GeminiProvider() });
  }
  if (process.env.GEMINI_API_KEY_2) {
    chain.push({ name: 'gemini_2', provider: new GeminiProvider(process.env.GEMINI_API_KEY_2) });
  }
  if (process.env.GROQ_API_KEY) {
    chain.push({ name: 'groq', provider: new GroqProvider() });
  }
  if (process.env.OPENAI_API_KEY) {
    chain.push({ name: 'openai', provider: new OpenAIProvider() });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    chain.push({ name: 'claude', provider: new ClaudeProvider() });
  }

  const allowed = options.tier === 'free' ? chain.filter((c) => freeProviderNames().includes(c.name)) : chain;
  return new FallbackAIProvider(allowed, options.onAttempt);
}

/** Unchanged behaviour for scripts and anything that does not know the student: the full chain, no log. */
export function createDefaultAIProvider(): AIProvider {
  return createAIProvider({ tier: 'paid' });
}
