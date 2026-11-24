import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';
import { readSse } from './sse';

// Talks to the Gemini REST API directly rather than pulling in @google/genai —
// one fetch call, no extra dependency, and it's trivial to swap for the SDK
// later without touching anything outside this file. Nothing else in the
// codebase should import a model SDK or call this endpoint directly.
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const endpointFor = (model: string, streaming = false) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:${streaming ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}`;

// Without this, a hung Gemini call (bad network, Google-side stall, etc.)
// had nothing stopping it — Vercel's own platform limit for a function is
// minutes long (300s by default as of fluid compute), so the user just saw
// the request sit on "Pending" forever with no error, no matter how long
// they waited. This bounds it to something a person will actually wait out,
// and turns the failure into real JSON the UI can show instead of a
// platform-level timeout response.
// v134: a chat turn that has not answered in 10 s is treated as stuck so the next provider (Groq) takes over; it was 20 s, which made students wait that long before any backup was tried.
const REQUEST_TIMEOUT_MS = 10_000;
const IMAGE_REQUEST_TIMEOUT_MS = 60_000; // reading several photos takes longer than a chat turn

// Google's own "high demand" response for this model (503 UNAVAILABLE) is a
// transient capacity hiccup, not a real failure — seen live: a student's
// /learn session failing outright on the very first 503, when a one-time
// retry a couple seconds later usually goes straight through. 429 (rate
// limit) is the same story. Anything else (a bad API key, a malformed
// request, a genuine timeout) retrying won't fix, so those still fail
// immediately rather than doubling the wait for no benefit.
const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiProvider implements AIProvider {
  readonly supportsImages = true;
  // `model` lets the same API key be tried against a second Gemini model as
  // a fallback rung (see ai-provider/factory.ts) — a different model can
  // have different capacity even when one is overloaded, at no extra signup.
  constructor(
    private apiKey: string = process.env.GEMINI_API_KEY!,
    private model: string = DEFAULT_GEMINI_MODEL
  ) {
    if (!this.apiKey) throw new Error('missing_gemini_api_key');
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attemptComplete(params);
      } catch (err: any) {
        lastError = err;
        const retryableStatus = Number(/^gemini_request_failed: (\d+)/.exec(err?.message ?? '')?.[1]);
        // v134: text-only chat calls do not retry the same overloaded model; they fall straight through to the next provider. Photo reading still retries once.
        const canRetry = attempt < MAX_ATTEMPTS && RETRYABLE_STATUS.has(retryableStatus) && !!params.images?.length;
        if (!canRetry) throw err;
        await sleep(RETRY_DELAY_MS);
      }
    }

    // Unreachable in practice (the loop always returns or throws above) —
    // satisfies TypeScript's control-flow analysis.
    throw lastError ?? new Error('gemini_request_failed: unknown');
  }

  private async attemptComplete(params: AICompletionParams): Promise<AICompletionResult> {
    const streaming = !!params.onToken && params.responseFormat !== 'json' && !params.images?.length;
    const body = {
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: params.userMessage }, ...(params.images ?? []).map((im) => ({ inline_data: { mime_type: im.mimeType, data: im.base64 } }))] }],
      generationConfig: {
        // Cost control (docs/architecture.md §13): short, focused turns.
        // Tutor turns don't need much room; raise this if a strategy (e.g.
        // EXAMPLE with a worked solution) starts getting truncated.
        maxOutputTokens: params.images?.length ? 4096 : 512,
        temperature: 0.4,
        ...(params.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const controller = new AbortController();
    const timeoutMs = params.images?.length ? IMAGE_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${endpointFor(this.model, streaming)}key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`gemini_request_timeout: no response within ${timeoutMs / 1000}s`);
      }
      throw new Error(`gemini_request_network_error: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`gemini_request_failed: ${res.status} ${errText}`);
    }

    if (streaming) {
      let text = ''; let usageMeta: any = null; let stalled = false;
      await readSse(res, (payload) => {
        let j: any; try { j = JSON.parse(payload); } catch { return; }
        const piece: string = j.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? '').join('') ?? '';
        if (piece) { text += piece; params.onToken!(piece); }
        usageMeta = j.usageMetadata ?? usageMeta;
      }, { idleMs: REQUEST_TIMEOUT_MS, onIdle: () => { stalled = true; controller.abort(); } }).catch((err: any) => {
        if (stalled || err?.name === 'AbortError') throw new Error(`gemini_request_timeout: stream stalled for ${REQUEST_TIMEOUT_MS / 1000}s`);
        throw new Error(`gemini_request_network_error: ${err?.message ?? err}`);
      });
      return { text, usage: { inputTokens: usageMeta?.promptTokenCount ?? 0, outputTokens: usageMeta?.candidatesTokenCount ?? Math.ceil(text.length / 4) } };
    }

    const json = await res.json();
    const text: string = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    const usage = {
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    };

    return { text, usage };
  }
}
