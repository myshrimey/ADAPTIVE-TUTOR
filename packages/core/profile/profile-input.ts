// v119: cleaning what the profile form sends. Before, the save route passed the raw request straight to the database: any text of any length,
// anything in the email/phone boxes, and numbers outside the usual range. Pure rules: trims, caps lengths, checks the few fields that have a shape.
export const PROFILE_CAPS = { school: 120, city: 60, state: 60, board: 30, name: 80, relation: 40, occupation: 80, email: 254, phone: 20, address: 300, heard: 200, remarks: 300 } as const;

export type ProfileErrorCode = 'profile_parent_email_invalid' | 'profile_parent_phone_invalid' | 'profile_siblings_invalid' | 'profile_percentage_invalid' | 'profile_class_invalid' | 'profile_too_many_rows';
export const PROFILE_ERROR_TEXT: Record<ProfileErrorCode, string> = {
  profile_parent_email_invalid: 'The parent email does not look right. You can leave it empty.',
  profile_parent_phone_invalid: 'The parent phone number does not look right. Use digits only, with an optional + at the start.',
  profile_siblings_invalid: 'Number of brothers and sisters should be a whole number from 0 to 20.',
  profile_percentage_invalid: 'A percentage must be a number from 0 to 100.',
  profile_class_invalid: 'Class must be 6, 7, 8 or 9.',
  profile_too_many_rows: 'Too many class rows were sent.',
};

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return t ? t.slice(0, max) : null;
};

export interface CleanDetails { schoolName: string | null; schoolBoard: string | null; schoolCity: string | null; schoolState: string | null; parentName: string | null; parentRelation: string | null; parentOccupation: string | null; parentEmail: string | null; parentPhone: string | null; siblingsCount: number | null; address: string | null; howHeardAboutUs: string | null }
export interface CleanHistoryRow { classLevel: 6 | 7 | 8 | 9; overallPercentage: number | null; board: string | null; remarks: string | null }
export type CleanProfile = { ok: true; details: CleanDetails; history: CleanHistoryRow[] } | { ok: false; code: ProfileErrorCode };

export function cleanProfileInput(rawDetails: unknown, rawHistory: unknown): CleanProfile {
  const d: any = rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails) ? rawDetails : {};
  const email = text(d.parentEmail, PROFILE_CAPS.email);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { ok: false, code: 'profile_parent_email_invalid' };
  const phone = text(d.parentPhone, 40);
  if (phone && !/^\+?[0-9 ()-]{6,20}$/.test(phone)) return { ok: false, code: 'profile_parent_phone_invalid' };
  let siblings: number | null = null;
  if (d.siblingsCount !== null && d.siblingsCount !== undefined && d.siblingsCount !== '') {
    const n = typeof d.siblingsCount === 'number' ? d.siblingsCount : Number(d.siblingsCount);
    if (!Number.isInteger(n) || n < 0 || n > 20) return { ok: false, code: 'profile_siblings_invalid' };
    siblings = n;
  }
  const details: CleanDetails = {
    schoolName: text(d.schoolName, PROFILE_CAPS.school), schoolBoard: text(d.schoolBoard, PROFILE_CAPS.board), schoolCity: text(d.schoolCity, PROFILE_CAPS.city), schoolState: text(d.schoolState, PROFILE_CAPS.state),
    parentName: text(d.parentName, PROFILE_CAPS.name), parentRelation: text(d.parentRelation, PROFILE_CAPS.relation), parentOccupation: text(d.parentOccupation, PROFILE_CAPS.occupation),
    parentEmail: email, parentPhone: phone, siblingsCount: siblings, address: text(d.address, PROFILE_CAPS.address), howHeardAboutUs: text(d.howHeardAboutUs, PROFILE_CAPS.heard),
  };
  const history: CleanHistoryRow[] = [];
  if (rawHistory !== undefined && rawHistory !== null) {
    if (!Array.isArray(rawHistory)) return { ok: false, code: 'profile_too_many_rows' };
    if (rawHistory.length > 4) return { ok: false, code: 'profile_too_many_rows' };
    const seen = new Set<number>();
    for (const e of rawHistory as any[]) {
      const cl = Number(e?.classLevel);
      if (![6, 7, 8, 9].includes(cl) || seen.has(cl)) return { ok: false, code: 'profile_class_invalid' };
      seen.add(cl);
      let pct: number | null = null;
      if (e.overallPercentage !== null && e.overallPercentage !== undefined && e.overallPercentage !== '') {
        const p = Number(e.overallPercentage);
        if (!Number.isFinite(p) || p < 0 || p > 100) return { ok: false, code: 'profile_percentage_invalid' };
        pct = Math.round(p * 100) / 100;
      }
      history.push({ classLevel: cl as 6 | 7 | 8 | 9, overallPercentage: pct, board: text(e.board, PROFILE_CAPS.board), remarks: text(e.remarks, PROFILE_CAPS.remarks) });
    }
  }
  return { ok: true, details, history };
}
