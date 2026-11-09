// v103: request limit for the free public readiness check. Pure rules only (no database, no hashing here).
// Nothing is recorded about the person: only a one-way hash of the internet address and a time, forgotten after an hour.
export const PUBLIC_CHECK_WINDOW_MINUTES = 10;
/** Per internet address per window. Generous on purpose: a school or a family may share one address, and each person uses about 2 requests. */
export const PUBLIC_CHECK_MAX_PER_IP = 120;
export const PUBLIC_CHECK_KEEP_HOURS = 1;

export type PublicCheckDecision = { allowed: true } | { allowed: false; reason: 'too_many_requests'; retryAfterSeconds: number };

/** Decide from the number of recent requests. A count that is not a number is treated as 0 (never block on bad data). */
export function decidePublicCheck(recentRequests: number): PublicCheckDecision {
  const n = Number.isFinite(recentRequests) ? recentRequests : 0;
  if (n >= PUBLIC_CHECK_MAX_PER_IP) return { allowed: false, reason: 'too_many_requests', retryAfterSeconds: PUBLIC_CHECK_WINDOW_MINUTES * 60 };
  return { allowed: true };
}

export const PUBLIC_CHECK_BLOCKED_TEXT = 'Too many requests from your network just now. Please wait about 10 minutes and try again.';

// v110: request limit for "forgot password". Pure rules only. Stored as one-way hashes in public_check_log (no new table).
export const RESET_WINDOW_MINUTES = 60;
export const RESET_MAX_PER_IP = 5;
export const RESET_MAX_PER_EMAIL = 3;
export type ResetDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };
/** Decide from recent counts for this internet address and this email. Bad numbers count as 0 (never block on bad data). */
export function decideResetRequest(recentForIp: number, recentForEmail: number): ResetDecision {
  const a = Number.isFinite(recentForIp) ? recentForIp : 0;
  const b = Number.isFinite(recentForEmail) ? recentForEmail : 0;
  if (a >= RESET_MAX_PER_IP || b >= RESET_MAX_PER_EMAIL) return { allowed: false, retryAfterSeconds: RESET_WINDOW_MINUTES * 60 };
  return { allowed: true };
}
/** Same words whether or not the account exists, so the form cannot be used to find out who has an account. */
export const RESET_NEUTRAL_TEXT = 'If an account uses that email, a password reset link is on its way. Please check your inbox and spam folder.';
export const RESET_BLOCKED_TEXT = 'Too many reset requests just now. Please wait about an hour and try again.';
