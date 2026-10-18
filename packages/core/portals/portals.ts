// Portals (v50): parents, tutors and coaching centres each get their own sign-up, sign-in and dashboard.
// Pure rules only (the barrel is imported by the browser): no database, no Node-only modules.

export type PortalRole = 'parent' | 'tutor' | 'centre';
export const PORTAL_ROLES: PortalRole[] = ['parent', 'tutor', 'centre'];
export type LoginPortal = PortalRole | 'teacher' | 'student';

export const PORTAL_INFO: Record<PortalRole, { label: string; plural: string; home: string; blurb: string; needsApproval: boolean; emailRequired: boolean }> = {
  parent: { label: 'Parent', plural: 'Parents', home: '/parent', blurb: 'Follow your child\'s practice, tests and progress.', needsApproval: false, emailRequired: false },
  tutor: { label: 'Tutor', plural: 'Tutors', home: '/tutor', blurb: 'See how the students you teach are doing and what to cover next.', needsApproval: true, emailRequired: true },
  centre: { label: 'Coaching centre', plural: 'Coaching centres', home: '/centre', blurb: 'See all your enrolled students in one place.', needsApproval: true, emailRequired: true },
};

export function isPortalRole(x: unknown): x is PortalRole {
  return x === 'parent' || x === 'tutor' || x === 'centre';
}

/** Where each kind of account belongs after signing in. */
export function portalHome(role: string): string {
  if (role === 'parent' || role === 'tutor' || role === 'centre') return PORTAL_INFO[role].home;
  if (role === 'teacher') return '/teacher';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

// ---- One-time link codes ----------------------------------------------------------------------------
export const LINK_CODE_TTL_DAYS = 7;
export const MAX_ACTIVE_LINK_CODES = 3;
export const LINK_ATTEMPTS_PER_HOUR = 10;
const CODE_CHARS = 'ABCDEFGHJKMNPQRTUVWXYZ2346789'; // no look-alikes (0/O, 1/I/L, 5/S)

export function generateLinkCode(length = 8): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

/** Accepts "abcd-2345", "ABCD 2345" etc. Returns the bare 8-character code or null. */
export function normaliseLinkCode(raw: unknown): string | null {
  const c = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  return c.length === 8 && [...c].every((ch) => CODE_CHARS.includes(ch)) ? c : null;
}

export function formatLinkCode(code: string): string {
  return code.slice(0, 4) + '-' + code.slice(4);
}

export const PORTAL_ERROR_TEXT: Record<string, string> = {
  signups_closed: 'Sign-up is closed right now.',
  consent_required: 'Please tick the box to agree.',
  missing_name: 'Please enter a name.',
  missing_email: 'An email address is needed for this kind of account.',
  username_taken: 'That username is already taken. Try another.',
  email_already_registered: 'That email already has an account. Sign in instead.',
  too_many_attempts: 'Too many tries from this connection. Please wait an hour and try again.',
  daily_cap_reached: 'Sign-ups are full for today. Please try again tomorrow.',
  register_failed: 'Could not register right now. Please try again later.',
  username_length: 'Username must be 3 to 20 characters.',
  username_chars: 'Use only letters, numbers, dot or underscore in the username.',
  username_reserved: 'That username is not available.',
  password_short: 'Password must be at least 8 characters.',
  password_weak: 'That password is too easy to guess. Try another.',
  password_same_as_username: 'Password cannot be the same as the username.',
  invalid_email: 'That email does not look right.',
  invalid_login: 'Wrong username or password.',
  wrong_portal: 'This account belongs to a different sign-in page.',
  login_failed: 'Could not sign in right now. Please try again.',
};
