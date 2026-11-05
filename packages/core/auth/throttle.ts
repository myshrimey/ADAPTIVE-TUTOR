// v96: sign-in brute-force protection. Pure rules only (no database, no hashing here).
// Security control, NOT a record of people: only FAILED attempts are counted, only as one-way hashes,
// and they are forgotten after a short time. Successful sign-ins are never recorded.
export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILS_PER_ACCOUNT = 8;   // wrong passwords for ONE username/email within the window
export const LOGIN_MAX_FAILS_PER_IP = 40;       // wrong passwords from ONE internet address within the window (a school or a family may share one)
export const LOGIN_KEEP_HOURS = 24;             // failed-attempt rows older than this are removed by the app itself

export type LoginDecision = { allowed: true } | { allowed: false; reason: 'too_many_attempts'; retryAfterSeconds: number };

/** The same person typing "Rahul", " rahul " or "RAHUL@x.in" must count as one account. */
export function normaliseLoginKey(identifier: string): string {
  return String(identifier ?? '').trim().toLowerCase().slice(0, 200);
}

/** Decide from the number of recent failures. Counts that are not numbers are treated as 0 (never lock anyone out on bad data). */
export function decideLogin(accountFails: number, ipFails: number): LoginDecision {
  const a = Number.isFinite(accountFails) ? accountFails : 0;
  const i = Number.isFinite(ipFails) ? ipFails : 0;
  if (a >= LOGIN_MAX_FAILS_PER_ACCOUNT || i >= LOGIN_MAX_FAILS_PER_IP) {
    return { allowed: false, reason: 'too_many_attempts', retryAfterSeconds: LOGIN_WINDOW_MINUTES * 60 };
  }
  return { allowed: true };
}

/** Shown on every sign-in form when the limit is reached. Neutral: it blames no one. */
export const LOGIN_BLOCKED_TEXT = 'Too many wrong tries just now. For safety, please wait 15 minutes and try again. If you forgot your password, use "Forgot password".';
