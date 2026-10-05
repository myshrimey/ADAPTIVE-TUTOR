import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';

// Talks to the Gemini REST API directly rather than pulling in @google/genai —
// one fetch call, no extra dependency, and it's trivial to swap for the SDK
// later without touching anything outside this file. Nothing else in the
// codebase should import a model SDK or call this endpoint directly.
const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Without this, a hung Gemini call (bad network, Google-side stall, etc.)
// had nothing stopping it — Vercel's own platform limit for a function is
// minutes long (300s by default as of fluid compute), so the user just saw
// the request sit on "Pending" forever with no error, no matter how long
// they waited. This bounds it to something a person will actually wait out,
// and turns the failure into real JSON the UI can show instead of a
// platform-level timeout response.
const REQUEST_TIMEOUT_MS = 20_000;

export class GeminiProvider implements AIProvider {
  constructor(private apiKey: string = process.env.GEMINI_API_KEY!) {
    if (!this.apiKey) throw new Error('missing_gemini_api_key');
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const body = {
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: params.userMessage }] }],
      generationConfig: {
        // Cost control (docs/architecture.md §13): short, focused turns.
        // Tutor turns don't need much room; raise this if a strategy (e.g.
        // EXAMPLE with a worked solution) starts getting truncated.
        maxOutputTokens: 512,
        temperature: 0.4,
        ...(params.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${GEMINI_ENDPOINT}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`gemini_request_timeout: no response within ${REQUEST_TIMEOUT_MS / 1000}s`);
      }
      throw new Error(`gemini_request_network_error: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`gemini_request_failed: ${res.status} ${errText}`);
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
