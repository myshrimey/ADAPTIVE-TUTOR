// Sign-up identity rules (v45). Pure functions: no database, no Node-only modules (the barrel is imported by the browser).
// A family signs up with a USERNAME and password; an email is optional. Supabase needs an email-shaped login, so
// username-only accounts get a private placeholder address that is never shown and never receives mail.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PLACEHOLDER_EMAIL_DOMAIN = 'users.sahayak.invalid'; // ".invalid" is reserved: it can never be a real mailbox
export const CONSENT_VERSION = 'v1-2026-10';

export function normaliseUsername(raw: string): string {
  return String(raw ?? '').trim().toLowerCase();
}

export type IdentityError = 'username_length' | 'username_chars' | 'username_reserved' | 'password_short' | 'password_weak' | 'password_same_as_username' | 'invalid_email';

const RESERVED = new Set(['admin', 'administrator', 'sahayak', 'support', 'teacher', 'root', 'founder', 'help', 'official']);
const COMMON = new Set(['password', 'password1', '12345678', '123456789', '1234567890', 'qwertyui', 'qwerty123', 'iloveyou', 'abcd1234', '11111111', '00000000', 'sahayak123', 'password123']);

export function validateUsername(raw: string): IdentityError | null {
  const u = normaliseUsername(raw);
  if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) return 'username_length';
  if (!/^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(u) || /[._]{2}/.test(u)) return 'username_chars';
  if (RESERVED.has(u)) return 'username_reserved';
  return null;
}

export function validatePassword(password: string, username: string): IdentityError | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return 'password_short';
  if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) return 'password_weak';
  if (normaliseUsername(username) === password.toLowerCase()) return 'password_same_as_username';
  return null;
}

export function validateOptionalEmail(raw: string | null | undefined): IdentityError | null {
  const e = String(raw ?? '').trim();
  if (!e) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e) && e.length <= 254 ? null : 'invalid_email';
}

export function placeholderEmail(username: string): string {
  return `${normaliseUsername(username)}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@' + PLACEHOLDER_EMAIL_DOMAIN);
}

/** Plain-words message for a validation error. */
export const IDENTITY_ERROR_TEXT: Record<IdentityError, string> = {
  username_length: `Username must be ${USERNAME_MIN} to ${USERNAME_MAX} characters.`,
  username_chars: 'Username can use small letters, numbers, dot and underscore only, and must start and end with a letter or number.',
  username_reserved: 'That username is not available. Please choose another.',
  password_short: `Password must be at least ${PASSWORD_MIN} characters.`,
  password_weak: 'That password is too easy to guess. Please choose a harder one.',
  password_same_as_username: 'Password must be different from the username.',
  invalid_email: 'That email does not look right. You can also leave it empty.',
};

/** Max sign-ups from one internet address in an hour, and the default for all families in a day. */
export const SIGNUPS_PER_IP_PER_HOUR = 5;
export const DEFAULT_DAILY_SIGNUP_CAP = 100;

/** A random, easy-to-copy password (no look-alike characters such as 0/O or l/1). Runs in the browser or on the server. */
export function generateReadablePassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789';
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
