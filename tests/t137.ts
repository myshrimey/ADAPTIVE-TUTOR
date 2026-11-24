// t137: streaming tutor replies (v137): pieces arrive as written, nothing saved early, failover clears partial text, plain calls unchanged.
import { readFileSync } from 'fs';
import { readSse } from '../packages/core/ai-provider/sse';
import { GroqProvider } from '../packages/core/ai-provider/groq.provider';
import { GeminiProvider } from '../packages/core/ai-provider/gemini.provider';
import { FallbackAIProvider } from '../packages/core/ai-provider/fallback.provider';
import { OpenAICompatibleProvider } from '../packages/core/ai-gateway/adapters';
import { withTokens, ndjsonResponse, wantsStream } from '../apps/web/lib/stream-turn';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const sseBody = (chunks: string[]) => new Response(new ReadableStream({ start(c) { const e = new TextEncoder(); for (const x of chunks) c.enqueue(e.encode(x)); c.close(); } }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const realFetch = globalThis.fetch;
(async () => {
  // SSE reader: a line split across two network chunks, [DONE] stops
  const got: string[] = [];
  await readSse(sseBody(['data: {"a":1}\n\nda', 'ta: {"a":2}\n\ndata: [DONE]\n\ndata: {"a":3}\n\n']), (p) => got.push(p), { idleMs: 1000, onIdle: () => {} });
  ok(got.join('|') === '{"a":1}|{"a":2}', 'SSE reader joins split lines and stops at [DONE]');
  // Groq streaming
  let sent: any = null;
  globalThis.fetch = (async (_u: any, init: any) => { sent = JSON.parse(init.body); return sseBody(['data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n', 'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n', 'data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":2}}\n\n', 'data: [DONE]\n\n']); }) as any;
  const pieces: string[] = [];
  const g = await new GroqProvider('k').complete({ systemPrompt: 's', userMessage: 'u', onToken: (p) => pieces.push(p) });
  ok(pieces.join('|') === 'Hel|lo' && g.text === 'Hello' && g.usage.inputTokens === 11 && g.usage.outputTokens === 2 && sent.stream === true, 'Groq streams pieces and still returns the full text and token counts');
  await new GroqProvider('k').complete({ systemPrompt: 's', userMessage: 'u', responseFormat: 'json', onToken: (p) => pieces.push(p) }).catch(() => {});
  ok(sent.stream === undefined, 'JSON calls never stream');
  globalThis.fetch = (async (_u: any, init: any) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'plain' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 }); }) as any;
  const plain = await new GroqProvider('k').complete({ systemPrompt: 's', userMessage: 'u' });
  ok(plain.text === 'plain' && sent.stream === undefined, 'without onToken the normal call is unchanged');
  // generic OpenAI-style adapter
  globalThis.fetch = (async () => sseBody(['data: {"choices":[{"delta":{"content":"A"}}]}\n\n', 'data: {"choices":[{"delta":{"content":"B"}}]}\n\ndata: [DONE]\n\n'])) as any;
  const p2: string[] = [];
  const oc = await new OpenAICompatibleProvider({ endpoint: 'https://x.test/v1/chat/completions', apiKey: 'k', model: 'm', vision: false, label: 'x' }).complete({ systemPrompt: 's', userMessage: 'u', onToken: (p) => p2.push(p) });
  ok(oc.text === 'AB' && p2.length === 2 && oc.usage.outputTokens >= 1, 'generic adapter streams; missing usage is estimated');
  // Gemini streaming
  let url = '';
  globalThis.fetch = (async (u: any) => { url = String(u); return sseBody(['data: {"candidates":[{"content":{"parts":[{"text":"Na"}]}}]}\n\n', 'data: {"candidates":[{"content":{"parts":[{"text":"maste"}]}}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":3}}\n\n']); }) as any;
  const p3: string[] = [];
  const ge = await new GeminiProvider('KEY', 'm1').complete({ systemPrompt: 's', userMessage: 'u', onToken: (p) => p3.push(p) });
  ok(/models\/m1:streamGenerateContent\?alt=sse&key=KEY$/.test(url) && ge.text === 'Namaste' && ge.usage.outputTokens === 3, 'Gemini uses the streaming endpoint and returns the full text');
  globalThis.fetch = (async (u: any) => { url = String(u); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 }); }) as any;
  await new GeminiProvider('KEY', 'm1').complete({ systemPrompt: 's', userMessage: 'u' });
  ok(/models\/m1:generateContent\?key=KEY$/.test(url), 'Gemini without onToken keeps the normal endpoint');
  await new GeminiProvider('KEY', 'm1').complete({ systemPrompt: 's', userMessage: 'u', images: [{ mimeType: 'image/png', base64: 'AA' }], onToken: () => {} });
  ok(/:generateContent\?key=KEY$/.test(url), 'photo reading never streams');
  globalThis.fetch = realFetch;
  // failover after partial text clears the screen once, then the next provider's text is the result
  let restarts = 0; const shown: string[] = [];
  const chain = new FallbackAIProvider([
    { name: 'a', provider: { complete: async (p) => { p.onToken?.('par'); throw new Error('boom'); } } },
    { name: 'b', provider: { complete: async (p) => { p.onToken?.('whole'); return { text: 'whole', usage: { inputTokens: 1, outputTokens: 1 } }; } } },
  ]);
  const fr = await chain.complete({ systemPrompt: 's', userMessage: 'u', onToken: (t) => shown.push(t), onRestart: () => { restarts++; shown.length = 0; } });
  ok(fr.text === 'whole' && restarts === 1 && shown.join('') === 'whole', 'failover after partial text: one restart, final text from the next provider');
  let r2 = 0;
  await new FallbackAIProvider([{ name: 'a', provider: { complete: async () => { throw new Error('x'); } } }, { name: 'b', provider: { complete: async () => ({ text: 't', usage: { inputTokens: 0, outputTokens: 0 } }) } }]).complete({ systemPrompt: 's', userMessage: 'u', onToken: () => {}, onRestart: () => { r2++; } });
  ok(r2 === 0, 'no restart when nothing had been sent');
  // wrapper only streams the tutor reply
  const seen: any[] = [];
  const wrapped = withTokens({ complete: async (p) => { seen.push(p); return { text: '', usage: { inputTokens: 0, outputTokens: 0 } }; } }, () => {}, () => {});
  await wrapped.complete({ systemPrompt: '', userMessage: '', feature: 'tutor' });
  await wrapped.complete({ systemPrompt: '', userMessage: '', feature: 'evaluation', responseFormat: 'json' });
  ok(typeof seen[0].onToken === 'function' && seen[1].onToken === undefined, 'only the tutor reply is streamed; marking is not');
  // ndjson response
  const res = ndjsonResponse(async (emit) => { emit({ t: 'token', v: 'hi' }); return { tutorMessage: 'hi' }; });
  const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
  ok(res.headers.get('content-type')!.includes('ndjson') && lines[0].t === 'token' && lines[1].t === 'done' && lines[1].data.tutorMessage === 'hi', 'stream ends with the finished turn');
  const bad = await ndjsonResponse(async () => { throw new Error('daily_ai_limit'); }).text();
  ok(JSON.parse(bad.trim()).t === 'error' && !bad.includes('"done"'), 'a failed turn ends with an error line and no done line');
  ok(wantsStream(new Request('http://x/api?stream=1')) && !wantsStream(new Request('http://x/api')), 'only ?stream=1 asks for a stream');
  // nothing is saved before the reply is complete; orchestrator itself untouched
  const orch = R('packages/core/orchestrator/tutor.orchestrator.ts');
  ok(!/onToken|onRestart/.test(orch), 'orchestrator is unchanged (streaming wraps the provider)');
  ok(/aiProvider\.complete\([^)]*feature: 'tutor' \}\);\s*\n\s*(if \(input\.studentMessage\) \{\s*\n\s*)?await supabase\.from\('messages'\)/.test(orch), 'messages are saved only after the full reply returns');
  for (const r of ['message', 'answer']) { const s = R(`apps/web/app/api/session/${r}/route.ts`); ok(/wantsStream\(request\)/.test(s) && /withTokens\(ai/.test(s) && /return NextResponse\.json\(\{ data: turn/.test(s), `${r} route streams on request and keeps the normal reply`); }
  const page = R('apps/web/app/learn/page.tsx');
  ok(/\?stream=1/.test(page) && /readTurnStream/.test(page) && /await res\.json\(\)/.test(page) && /setStreamingText\(null\)/.test(page), 'lesson screen streams, falls back to the normal reply, and clears the partial text');
  console.log(`t137: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
