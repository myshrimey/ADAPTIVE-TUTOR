// v98: what a visitor may be told when something fails on the server.
// A short machine code (e.g. "subject_not_allowed", "unauthenticated") written on purpose by our own code is passed through,
// because screens map those to friendly sentences. Anything else (a database message, a library message, a stack-like
// sentence) is replaced by a neutral code and logged on the server only, so table names, column names and constraint
// names never reach a browser.
const SAFE_CODE = /^[a-z][a-z0-9_]{1,63}$/;

export function publicError(err: unknown, fallback = 'unknown_error'): string {
  const raw = typeof err === 'string' ? err : (err as any)?.message;
  const msg = typeof raw === 'string' ? raw : '';
  if (SAFE_CODE.test(msg)) return msg;
  try { console.error('[server error hidden from visitor]', msg.slice(0, 300)); } catch { /* ignore */ }
  return fallback;
}
