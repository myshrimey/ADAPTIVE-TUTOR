// v79: shareable invitations. The role is decided by the inviter and locked on the server; the invitee never chooses it.
export const INVITE_ROLES = ['student', 'parent', 'teacher', 'tutor', 'centre'] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];
export const INVITE_ROLE_LABEL: Record<InviteRole, string> = { student: 'Student', parent: 'Parent', teacher: 'Teacher', tutor: 'Tutor', centre: 'Coaching Centre' };
export const INVITE_STATUSES = ['pending', 'opened', 'accepted', 'expired', 'revoked', 'cancelled'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];
export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = { pending: 'Pending', opened: 'Opened', accepted: 'Accepted', expired: 'Expired', revoked: 'Revoked', cancelled: 'Cancelled' };
export const DEFAULT_EXPIRY_DAYS = 14; export const MAX_EXPIRY_DAYS = 90;

export const MSG_EXPIRED = 'This invitation has expired. Please contact the Sahayak administrator for a new invitation.';
export const MSG_REVOKED = 'This invitation is no longer active. Please contact the Sahayak administrator.';
export const MSG_NOT_FOUND = 'This invitation link is not valid. Please check the link or contact the Sahayak administrator.';
export const MSG_ACCEPTED = 'This invitation has already been used. If this was you, please sign in. Otherwise contact the Sahayak administrator.';
export const MSG_EXISTING = 'An account with these contact details already exists. Please sign in instead. Your role will not be changed automatically; the Sahayak administrator has been told and will contact you if a change is needed.';

export interface FieldSpec { key: string; label: string; required?: boolean; kind?: 'text' | 'email' | 'phone' | 'longtext' | 'number' | 'date' | 'select'; options?: string[]; help?: string }
const BOARDS = ['CBSE', 'ICSE', 'State board', 'Other'];
const MEDIUM = ['English', 'Hindi', 'English and Hindi'];
/** "Email OR phone" is checked separately (contactOk). `name` and `email`/`phone` are common to every role. */
export const ROLE_FIELDS: Record<InviteRole, FieldSpec[]> = {
  student: [
    { key: 'class', label: 'Class', required: true, kind: 'select', options: ['Class 10', 'Class 9', 'Class 11', 'Class 12', 'Other'] },
    { key: 'board', label: 'Board', required: true, kind: 'select', options: BOARDS },
    { key: 'medium', label: 'Medium / language', required: true, kind: 'select', options: MEDIUM },
    { key: 'subjects', label: 'Subjects', required: true, help: 'For example: Maths, Science' },
    { key: 'parent_relationship', label: 'Parent relationship (if applicable)', help: 'For example: Mother of the student. Linking is done separately and only with consent.' },
    { key: 'date_of_birth', label: 'Date of birth', kind: 'date' }, { key: 'school', label: 'School' }, { key: 'location', label: 'Location' }, { key: 'referral_source', label: 'Referral source' },
  ],
  parent: [
    { key: 'child_name', label: 'Child name' }, { key: 'board', label: 'Board', kind: 'select', options: BOARDS }, { key: 'class', label: 'Class' },
  ],
  teacher: [
    { key: 'subjects', label: 'Subjects', required: true }, { key: 'boards', label: 'Board(s)', required: true, help: 'For example: CBSE' },
    { key: 'school', label: 'School' }, { key: 'experience', label: 'Experience (years)', kind: 'number' }, { key: 'languages', label: 'Languages' }, { key: 'location', label: 'Location' },
  ],
  tutor: [
    { key: 'subjects', label: 'Subjects', required: true }, { key: 'boards', label: 'Board(s)', required: true },
    { key: 'tuition_centre', label: 'Tuition centre' }, { key: 'experience', label: 'Experience (years)', kind: 'number' }, { key: 'languages', label: 'Languages' }, { key: 'location', label: 'Location' },
  ],
  centre: [
    { key: 'centre_name', label: 'Centre name', required: true }, { key: 'boards', label: 'Board(s)', required: true }, { key: 'classes', label: 'Classes', required: true }, { key: 'subjects', label: 'Subjects', required: true },
    { key: 'address', label: 'Address', kind: 'longtext' }, { key: 'city', label: 'City' }, { key: 'num_students', label: 'Number of students', kind: 'number' }, { key: 'num_teachers', label: 'Number of teachers', kind: 'number' }, { key: 'website', label: 'Website / social links' },
  ],
};
export const NAME_LABEL: Record<InviteRole, string> = { student: 'Student name', parent: 'Parent name', teacher: 'Teacher name', tutor: 'Tutor name', centre: 'Owner / admin name' };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const normaliseEmail = (v: unknown) => String(v ?? '').trim().toLowerCase();
export const normalisePhone = (v: unknown) => String(v ?? '').replace(/[^\d+]/g, '').slice(0, 16);
export const isInviteRole = (v: unknown): v is InviteRole => (INVITE_ROLES as readonly string[]).includes(String(v));

export interface CleanInvite { role: InviteRole; name: string; email: string | null; phone: string | null; fields: Record<string, string>; note: string | null; expiryDays: number; department: string | null }
/** Validate what the inviter typed. Returns the cleaned record or ONE plain-words error. Never trusts the browser's role: it must be one of the five. */
export function validateInvite(input: any, opts: { expiryDays?: number } = {}): { ok: true; value: CleanInvite } | { ok: false; error: string } {
  if (!isInviteRole(input?.role)) return { ok: false, error: 'Please choose who you are inviting.' };
  const role = input.role as InviteRole;
  const name = String(input?.name ?? '').trim().slice(0, 120);
  if (!name) return { ok: false, error: `${NAME_LABEL[role]} is required.` };
  const email = normaliseEmail(input?.email) || null; const phone = normalisePhone(input?.phone) || null;
  if (!email && !phone) return { ok: false, error: 'Please give an email address or a phone number.' };
  if (email && !EMAIL.test(email)) return { ok: false, error: 'That email address does not look right.' };
  if (phone && phone.replace(/\D/g, '').length < 8) return { ok: false, error: 'That phone number looks too short.' };
  const fields: Record<string, string> = {}; const src = input?.fields && typeof input.fields === 'object' ? input.fields : {};
  for (const f of ROLE_FIELDS[role]) {
    const v = String(src[f.key] ?? '').trim().slice(0, f.kind === 'longtext' ? 400 : 200);
    if (f.required && !v) return { ok: false, error: `${f.label} is required.` };
    if (f.kind === 'select' && v && f.options && !f.options.includes(v)) return { ok: false, error: `${f.label}: please choose one of the options.` };
    if (v) fields[f.key] = v;
  }
  const d = Number(input?.expiryDays ?? opts.expiryDays ?? DEFAULT_EXPIRY_DAYS);
  const expiryDays = Number.isFinite(d) ? Math.min(MAX_EXPIRY_DAYS, Math.max(1, Math.round(d))) : DEFAULT_EXPIRY_DAYS;
  return { ok: true, value: { role, name, email, phone, fields, note: String(input?.note ?? '').trim().slice(0, 500) || null, expiryDays, department: String(input?.department ?? '').trim().slice(0, 80) || null } };
}
/** The fields the invitee sees on the onboarding page: the ones the inviter did not already fill in. */
export function missingFields(role: InviteRole, filled: Record<string, string>): FieldSpec[] {
  return ROLE_FIELDS[role].filter((f) => f.required && !String(filled?.[f.key] ?? '').trim());
}
