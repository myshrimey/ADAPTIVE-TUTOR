import { t } from '@adaptive-tutor/core';

// Turns the plan-enforcement error codes into a friendly sentence in the student's
// language (read from the same cookie the language toggle writes). Returns null for any
// other error so callers keep their own handling.
const KEYS: Record<string, string> = {
  access_required: 'access.required',
  access_expired: 'access.expired',
  subject_limit_reached: 'access.subjectLimit',
  invitation_required: 'auth.invitationOnly',
};

export function accessErrorMessage(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const key = KEYS[raw];
  if (!key) return null;
  let lang: 'en' | 'hi' = 'en';
  if (typeof document !== 'undefined' && /(?:^|;\s*)sahayak_lang=hi/.test(document.cookie)) lang = 'hi';
  return t(key as any, lang);
}
