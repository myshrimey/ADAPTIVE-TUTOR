import type { AIProvider, AICompletionParams, AICompletionResult } from '../ai-provider/ai-provider.interface';
import { GeminiProvider } from '../ai-provider/gemini.provider';
import { GroqProvider } from '../ai-provider/groq.provider';
import { OpenAIProvider } from '../ai-provider/openai.provider';
import { ClaudeProvider } from '../ai-provider/claude.provider';
import { KEY_ENV_RE, type ProviderRow } from './registry';

const TIMEOUT_MS = 20_000, IMAGE_TIMEOUT_MS = 60_000;

/** One generic adapter for every provider that offers an OpenAI-style chat-completions endpoint: adding such a provider is a registry row + an environment variable, no code. */
export class OpenAICompatibleProvider implements AIProvider {
  readonly supportsImages: boolean;
  constructor(private cfg: { endpoint: string; apiKey: string; model: string; vision: boolean; label: string }) {
    if (!/^https:\/\//.test(cfg.endpoint)) throw new Error('provider_endpoint_must_be_https');
    if (!cfg.apiKey) throw new Error('missing_provider_api_key');
    this.supportsImages = cfg.vision;
  }
  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const hasImages = !!params.images?.length;
    const userContent = hasImages
      ? [{ type: 'text', text: params.userMessage }, ...params.images!.map((im) => ({ type: 'image_url', image_url: { url: `data:${im.mimeType};base64,${im.base64}` } }))]
      : params.userMessage;
    const body = {
      model: this.cfg.model,
      messages: [{ role: 'system', content: params.systemPrompt }, { role: 'user', content: userContent }],
      max_tokens: hasImages ? 4096 : 512, temperature: 0.4,
      ...(params.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    };
    const controller = new AbortController();
    const ms = hasImages ? IMAGE_TIMEOUT_MS : TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), ms);
    let res: Response;
    try {
      res = await fetch(this.cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` }, body: JSON.stringify(body), signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error(`${this.cfg.label}_request_timeout: no response within ${ms / 1000}s`);
      throw new Error(`${this.cfg.label}_request_network_error: ${String(err?.message ?? err).slice(0, 120)}`);
    } finally { clearTimeout(timer); }
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`${this.cfg.label}_request_failed: ${res.status} ${t.slice(0, 120)}`); }
    const json = await res.json();
    return { text: json.choices?.[0]?.message?.content ?? '', usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 } };
  }
}

/** Builds the adapter for a registry row. The key is read from the server environment only (never from the database, never logged). */
export function buildAdapter(p: ProviderRow, modelOverride?: string | null, env: Record<string, string | undefined> = process.env): AIProvider {
  if (!p.key_env || !KEY_ENV_RE.test(p.key_env)) throw new Error('provider_key_name_invalid');
  const key = env[p.key_env];
  if (!key) throw new Error('missing_provider_api_key');
  const model = (modelOverride || p.model) ?? '';
  if (!model) throw new Error('provider_model_missing');
  switch (p.adapter) {
    case 'gemini': return new GeminiProvider(key, model);
    case 'groq': return new GroqProvider(key, model);
    case 'openai': return new OpenAIProvider(key, model);
    case 'claude': return new ClaudeProvider(key, model);
    case 'openai_compatible':
      return new OpenAICompatibleProvider({ endpoint: p.endpoint ?? '', apiKey: key, model, vision: p.vision === true, label: p.id.replace(/[^a-z0-9_]/g, '') });
    default: throw new Error('provider_adapter_unknown');
  }
}
