import type { AIProvider } from '@adaptive-tutor/core';
import { publicError } from '@adaptive-tutor/core';

// v137: streaming tutor replies. The lesson screen asks for `?stream=1`; the answer comes back as lines of JSON (NDJSON):
//   {"t":"token","v":"..."}   a piece of the tutor's reply (only the tutor's reply is ever streamed; marking and scoring are not)
//   {"t":"restart"}            the provider failed part-way and another is starting over: clear the partial reply
//   {"t":"done","data":{...}}  the finished turn, identical to what the normal endpoint returns
//   {"t":"error","error":"..."} the turn failed; nothing was saved
// Nothing is saved until the whole reply has arrived, exactly as before.

export const wantsStream = (request: Request): boolean => new URL(request.url).searchParams.get('stream') === '1';

/** Wraps a provider so that only the tutor's own reply call reports pieces. */
export function withTokens(inner: AIProvider, onToken: (piece: string) => void, onRestart: () => void): AIProvider {
  return {
    supportsImages: inner.supportsImages,
    complete: (p) => (p.feature === 'tutor' && p.responseFormat !== 'json' ? inner.complete({ ...p, onToken, onRestart }) : inner.complete(p)),
  };
}

export function ndjsonResponse(run: (emit: (o: Record<string, unknown>) => void) => Promise<unknown>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (o: Record<string, unknown>) => { if (!closed) { try { controller.enqueue(enc.encode(JSON.stringify(o) + '\n')); } catch { closed = true; } } };
      try {
        const data = await run(emit);
        emit({ t: 'done', data });
      } catch (err: any) {
        emit({ t: 'error', error: publicError(err) });
      }
      closed = true;
      try { controller.close(); } catch { /* already closed */ }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
}
