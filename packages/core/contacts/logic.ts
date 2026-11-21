// v136: pure helpers for the Contact book (no database here).
export type ContactError = 'contact_phone_invalid' | 'contact_email_invalid' | 'contact_note_too_long';

/** Keeps digits and one leading +; 7 to 15 digits. Empty means "clear it". */
export function cleanPhone(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const t = String(raw).trim();
  if (!t) return { ok: true, value: null };
  if (!/^\+?[0-9 ()-]+$/.test(t)) return { ok: false };
  const digits = t.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return { ok: false };
  return { ok: true, value: (t.startsWith('+') ? '+' : '') + digits };
}

export function cleanEmail(raw: unknown): { ok: true; value: string } | { ok: false } {
  const t = String(raw ?? '').trim().toLowerCase();
  if (t.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return { ok: false };
  return { ok: true, value: t };
}

export interface ContactPatch { email?: string; phone?: string | null; whatsapp?: string | null; note?: string | null }
export type CleanPatch = { ok: true; patch: ContactPatch } | { ok: false; code: ContactError };

/** Only the fields present are changed. */
export function cleanContactPatch(input: any): CleanPatch {
  const patch: ContactPatch = {};
  if (input && 'email' in input) { const e = cleanEmail(input.email); if (!e.ok) return { ok: false, code: 'contact_email_invalid' }; patch.email = e.value; }
  for (const k of ['phone', 'whatsapp'] as const) {
    if (input && k in input) { const p = cleanPhone(input[k]); if (!p.ok) return { ok: false, code: 'contact_phone_invalid' }; patch[k] = p.value; }
  }
  if (input && 'note' in input) {
    const n = input.note === null || input.note === undefined ? '' : String(input.note).trim();
    if (n.length > 300) return { ok: false, code: 'contact_note_too_long' };
    patch.note = n || null;
  }
  return { ok: true, patch };
}

export const CONTACT_ERROR_TEXT: Record<ContactError | 'contact_email_in_use' | 'contact_not_found' | 'contact_nothing_to_change' | 'contact_save_failed', string> = {
  contact_phone_invalid: 'A phone or WhatsApp number does not look right. Use 7 to 15 digits, with an optional + at the start.',
  contact_email_invalid: 'The email does not look right.',
  contact_note_too_long: 'The note is too long (300 characters at most).',
  contact_email_in_use: 'Another account already uses that email.',
  contact_not_found: 'That account was not found.',
  contact_nothing_to_change: 'Nothing to change.',
  contact_save_failed: 'The change could not be saved. Nothing was changed.',
};

export interface ContactRow {
  userId: string; role: string; email: string; username: string | null; name: string | null;
  phone: string | null; whatsapp: string | null; note: string | null;
  parentName: string | null; parentPhone: string | null; parentEmail: string | null; parentWhatsapp: string | null;
  createdAt: string | null;
}

export function matchesQuery(r: ContactRow, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [r.userId, r.email, r.username, r.name, r.phone, r.whatsapp, r.parentPhone, r.parentWhatsapp, r.parentEmail, r.parentName]
    .some((v) => (v ?? '').toLowerCase().includes(s));
}
