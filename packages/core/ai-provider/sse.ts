// v137: reads a Server-Sent-Events response body ("data: {...}" lines) and hands each data payload to `onData`.
// Used for streaming replies. Stops at "[DONE]". `idleMs` is the longest silence allowed between pieces; `onIdle` is called when it is exceeded.
export async function readSse(res: Response, onData: (payload: string) => void, opts: { idleMs: number; onIdle: () => void }): Promise<void> {
  if (!res.body) throw new Error('stream_no_body');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  const arm = () => { if (timer) clearTimeout(timer); timer = setTimeout(opts.onIdle, opts.idleMs); };
  arm();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      arm();
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, '');
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') return;
        onData(payload);
      }
    }
    const rest = buf.trim();
    if (rest.startsWith('data:')) { const p = rest.slice(5).trim(); if (p && p !== '[DONE]') onData(p); }
  } finally { if (timer) clearTimeout(timer); }
}
