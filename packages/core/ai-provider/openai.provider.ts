import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';

const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20_000;

export class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string = process.env.OPENAI_API_KEY!) {
    if (!this.apiKey) throw new Error('missing_openai_api_key');
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userMessage },
          ],
          temperature: 0.4,
          ...(params.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`openai_request_timeout: no response within ${REQUEST_TIMEOUT_MS / 1000}s`);
      }
      throw new Error(`openai_request_network_error: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`openai_request_failed: ${res.status} ${errText}`);
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