import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';
import { readSse } from './sse';

// Groq's free tier (console.groq.com) is the fallback for when Gemini's free
// tier is overloaded (see fallback.provider.ts) — different company,
// different infrastructure, different capacity, so the two being overloaded
// at the same moment is unlikely. Uses Groq's OpenAI-compatible chat
// completions endpoint, so no extra SDK dependency, same as GeminiProvider's
// own plain-fetch approach.
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const REQUEST_TIMEOUT_MS = 12_000; // v134: Groq normally answers in about a second; 12 s is already a stuck call

export class GroqProvider implements AIProvider {
  constructor(private apiKey: string = process.env.GROQ_API_KEY!, private model: string = GROQ_MODEL) {
    if (!this.apiKey) throw new Error('missing_groq_api_key');
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const streaming = !!params.onToken && params.responseFormat !== 'json';
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      max_tokens: 512,
      temperature: 0.4,
      ...(streaming ? { stream: true, stream_options: { include_usage: true } } : {}),
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

    if (streaming) {
      // v137: pieces go to the screen as they arrive; the full text is still returned so saving and logging are unchanged.
      let text = ''; let usage: any = null;
      let stalled = false;
      await readSse(res, (payload) => {
        let j: any; try { j = JSON.parse(payload); } catch { return; }
        const piece: string = j.choices?.[0]?.delta?.content ?? '';
        if (piece) { text += piece; params.onToken!(piece); }
        usage = j.usage ?? j.x_groq?.usage ?? usage;
      }, { idleMs: REQUEST_TIMEOUT_MS, onIdle: () => { stalled = true; controller.abort(); } }).catch((err: any) => {
        if (stalled || err?.name === 'AbortError') throw new Error(`groq_request_timeout: stream stalled for ${REQUEST_TIMEOUT_MS / 1000}s`);
        throw new Error(`groq_request_network_error: ${err?.message ?? err}`);
      });
      return { text, usage: { inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? Math.ceil(text.length / 4) } };
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
