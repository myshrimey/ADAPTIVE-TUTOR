import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';

// Paid last-resort rung (factory.ts) — only reached once every free provider
// (Gemini x2, Groq) has already failed. Uses Anthropic's Messages API
// directly, same plain-fetch approach as gemini.provider.ts/groq.provider.ts
// rather than pulling in @anthropic-ai/sdk.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const REQUEST_TIMEOUT_MS = 20_000;

export class ClaudeProvider implements AIProvider {
  constructor(private apiKey: string = process.env.ANTHROPIC_API_KEY!) {
    if (!this.apiKey) throw new Error('missing_claude_api_key');
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const body = {
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
      ...(params.responseFormat === 'json'
        ? { system: `${params.systemPrompt}\n\nRespond with ONLY valid JSON, no other text.` }
        : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(CLAUDE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`claude_request_timeout: no response within ${REQUEST_TIMEOUT_MS / 1000}s`);
      }
      throw new Error(`claude_request_network_error: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`claude_request_failed: ${res.status} ${errText}`);
    }

    const json = await res.json();
    const text: string = (json.content ?? [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text ?? '')
      .join('');
    const usage = {
      inputTokens: json.usage?.input_tokens ?? 0,
      outputTokens: json.usage?.output_tokens ?? 0,
    };

    return { text, usage };
  }
}