import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';

// Groq's free tier (console.groq.com) is the fallback for when Gemini's free
// tier is overloaded (see fallback.provider.ts) — different company,
// different infrastructure, different capacity, so the two being overloaded
// at the same moment is unlikely. Uses Groq's OpenAI-compatible chat
// completions endpoint, so no extra SDK dependency, same as GeminiProvider's
// own plain-fetch approach.
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const REQUEST_TIMEOUT_MS = 20_000;

export class GroqProvider implements AIProvider {
  constructor(private apiKey: string = process.env.GROQ_API_KEY!) {
    if (!this.apiKey) throw new Error('missing_groq_api_key');
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      max_tokens: 512,
      temperature: 0.4,
      ...(params.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`groq_request_timeout: no response within ${REQUEST_TIMEOUT_MS / 1000}s`);
      }
      throw new Error(`groq_request_network_error: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`groq_request_failed: ${res.status} ${errText}`);
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '';
    const usage = {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };

    return { text, usage };
  }
}
