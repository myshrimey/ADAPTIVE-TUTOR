// v121: checks what the onboarding route is given, before any database work.
// Pure rules (no database, no network). The route returns one of our own short codes; the page shows ONBOARDING_ERROR_TEXT.

export const ONBOARDING_NAME_MAX = 60; // same as sign-up
export const ONBOARDING_MAX_SUBJECTS = 12;
const TARGET_DATE_MAX_DAYS_AHEAD = 3 * 366;

export type OnboardingErrorCode = 'missing_required_fields' | 'onboarding_class_invalid' | 'onboarding_subjects_invalid' | 'onboarding_date_invalid';
export const ONBOARDING_ERROR_TEXT: Record<OnboardingErrorCode, string> = {
  missing_required_fields: 'Please fill in the student’s name.',
  onboarding_class_invalid: 'The class or board could not be read. Please go back and choose them again.',
  onboarding_subjects_invalid: 'Please choose between 1 and 12 subjects from the list.',
  onboarding_date_invalid: 'Please choose a real target date, from today up to three years ahead.',
};

export interface CleanOnboarding {
  displayName: string; grade: string; board: string; classLevel: string; subjects: string[];
  targetDate: string | null; examYear: 2027 | 2028; preferredLanguage: 'en' | 'hi'; dailyStudyMinutes: number | null;
}

const LABEL = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,29}$/; // board, class and grade labels such as CBSE, 10, CBSE-10
const SLUG = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function cleanOnboardingInput(raw: unknown, now: Date = new Date()): { ok: true; value: CleanOnboarding } | { ok: false; code: OnboardingErrorCode } {
  const b: any = raw && typeof raw === 'object' ? raw : {};
  const name = typeof b.displayName === 'string' ? b.displayName.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, ONBOARDING_NAME_MAX) : '';
  if (!name) return { ok: false, code: 'missing_required_fields' };
  const label = (v: unknown) => (typeof v === 'string' && LABEL.test(v.trim()) ? v.trim() : null);
  const board = label(b.board), classLevel = label(b.class), grade = label(b.grade);
  if (!board || !classLevel || !grade) return { ok: false, code: 'onboarding_class_invalid' };

  let list: unknown[];
  if (b.subjects === undefined || b.subjects === null) list = [typeof b.subject === 'string' && b.subject ? b.subject : 'maths'];
  else if (Array.isArray(b.subjects)) list = b.subjects.length > 0 ? b.subjects : [typeof b.subject === 'string' && b.subject ? b.subject : 'maths'];
  else return { ok: false, code: 'onboarding_subjects_invalid' };
  if (list.length > ONBOARDING_MAX_SUBJECTS) return { ok: false, code: 'onboarding_subjects_invalid' };
  const subjects: string[] = [];
  for (const s of list) {
    if (typeof s !== 'string' || !SLUG.test(s)) return { ok: false, code: 'onboarding_subjects_invalid' };
    if (!subjects.includes(s)) subjects.push(s); // repeats are ignored, order kept (the first is the active subject)
  }

  let targetDate: string | null = null;
  if (b.targetDate !== undefined && b.targetDate !== null && b.targetDate !== '') {
    const m = typeof b.targetDate === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.targetDate) : null;
    if (!m) return { ok: false, code: 'onboarding_date_invalid' };
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return { ok: false, code: 'onboarding_date_invalid' };
    const days = (t - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000;
    if (days < -1 || days > TARGET_DATE_MAX_DAYS_AHEAD) return { ok: false, code: 'onboarding_date_invalid' };
    targetDate = b.targetDate;
  }
  const mins = b.dailyStudyMinutes;
  return {
    ok: true,
    value: {
      displayName: name, grade, board, classLevel, subjects, targetDate,
      examYear: b.examYear === 2028 ? 2028 : 2027,
      preferredLanguage: b.preferredLanguage === 'hi' ? 'hi' : 'en',
      dailyStudyMinutes: typeof mins === 'number' && Number.isFinite(mins) && mins >= 5 && mins <= 480 ? Math.round(mins) : null,
    },
  };
}
