import type { AIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { OpenAIProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';
import { FallbackAIProvider } from './fallback.provider';

export function createDefaultAIProvider(): AIProvider {
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

  return new FallbackAIProvider(chain);
}
