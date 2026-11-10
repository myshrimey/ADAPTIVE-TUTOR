// t121: the onboarding route cleans every value before any database work (v121).
import { readFileSync } from 'fs';
import { cleanOnboardingInput, ONBOARDING_ERROR_TEXT, ONBOARDING_NAME_MAX } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const now = new Date('2026-11-09T10:00:00Z');
const good = { displayName: 'Aarav Sharma', grade: 'CBSE-10', board: 'CBSE', class: '10', subjects: ['maths', 'science'], examYear: 2027, preferredLanguage: 'hi', dailyStudyMinutes: 60 };
const g: any = cleanOnboardingInput(good, now);
ok(g.ok && g.value.displayName === 'Aarav Sharma' && g.value.subjects.join() === 'maths,science' && g.value.preferredLanguage === 'hi' && g.value.dailyStudyMinutes === 60 && g.value.targetDate === null, 'a normal request passes');
const code = (b: any) => (cleanOnboardingInput(b, now) as any).code;
// name
ok(code({ ...good, displayName: '' }) === 'missing_required_fields' && code({ ...good, displayName: '   ' }) === 'missing_required_fields' && code({ ...good, displayName: undefined }) === 'missing_required_fields' && code({ ...good, displayName: 42 }) === 'missing_required_fields' && code({ ...good, displayName: { a: 1 } }) === 'missing_required_fields', 'blank / non-text name refused');
ok((cleanOnboardingInput({ ...good, displayName: 'x'.repeat(5000) }, now) as any).value.displayName.length === ONBOARDING_NAME_MAX, 'long name cut to 60');
ok((cleanOnboardingInput({ ...good, displayName: '  Aarav \u0000\n  Sharma\t' }, now) as any).value.displayName === 'Aarav Sharma', 'control characters and extra spaces tidied');
ok((cleanOnboardingInput({ ...good, displayName: 'आरव शर्मा' }, now) as any).value.displayName === 'आरव शर्मा', 'Hindi name kept');
// labels
for (const k of ['board', 'class', 'grade']) for (const v of ['', 'x'.repeat(31), '<b>', 5, null, undefined, '; drop']) ok(code({ ...good, [k]: v }) === 'onboarding_class_invalid', `${k} refused: ${JSON.stringify(v)?.slice(0, 20)}`);
// subjects
ok((cleanOnboardingInput({ ...good, subjects: undefined }, now) as any).value.subjects.join() === 'maths', 'no subjects = maths (old clients)');
ok((cleanOnboardingInput({ ...good, subjects: undefined, subject: 'science' }, now) as any).value.subjects.join() === 'science', 'legacy single subject used');
ok((cleanOnboardingInput({ ...good, subjects: [] }, now) as any).value.subjects.join() === 'maths', 'empty list = maths');
ok((cleanOnboardingInput({ ...good, subjects: ['maths', 'maths', 'science'] }, now) as any).value.subjects.join() === 'maths,science', 'repeats ignored, order kept');
ok(code({ ...good, subjects: 'maths' }) === 'onboarding_subjects_invalid' && code({ ...good, subjects: Array(13).fill('maths').map((s, i) => s + i) }) === 'onboarding_subjects_invalid' && code({ ...good, subjects: Array(100000).fill('a') }) === 'onboarding_subjects_invalid', 'non-list / too many subjects refused');
for (const s of [[5], [{}], ['Maths'], ['a b'], ['x'.repeat(41)], ['maths,science'], ['../x'], [null]]) ok(code({ ...good, subjects: s }) === 'onboarding_subjects_invalid', `subject refused: ${JSON.stringify(s)}`);
// date
ok((cleanOnboardingInput({ ...good, targetDate: '2027-03-01' }, now) as any).value.targetDate === '2027-03-01' && (cleanOnboardingInput({ ...good, targetDate: '' }, now) as any).value.targetDate === null && (cleanOnboardingInput({ ...good, targetDate: '2026-11-08' }, now) as any).ok, 'good dates pass; blank = none; yesterday allowed (time zones)');
for (const d of ['01-03-2027', '2027-02-30', '2027-13-01', 'soon', 20270301, '2026-11-01', '2031-01-01', '2027-03-01T00:00:00Z']) ok(code({ ...good, targetDate: d }) === 'onboarding_date_invalid', `date refused: ${d}`);
// the rest are forced into safe values
const o: any = cleanOnboardingInput({ ...good, examYear: 1999, preferredLanguage: 'fr', dailyStudyMinutes: 99999 }, now);
ok(o.value.examYear === 2027 && o.value.preferredLanguage === 'en' && o.value.dailyStudyMinutes === null, 'year, language, minutes forced to safe values');
ok((cleanOnboardingInput({ ...good, dailyStudyMinutes: 'x' }, now) as any).value.dailyStudyMinutes === null && (cleanOnboardingInput({ ...good, dailyStudyMinutes: 45.6 }, now) as any).value.dailyStudyMinutes === 46, 'minutes: text dropped, number rounded');
ok(code(null) === 'missing_required_fields' && code('x') === 'missing_required_fields' && code([]) === 'missing_required_fields', 'non-object body refused');
ok(Object.values(ONBOARDING_ERROR_TEXT).every((t) => /^[A-Z]/.test(t) && !/_/.test(t)), 'plain-words messages');
// wiring
const route = readFileSync('apps/web/app/api/student/onboarding/route.ts', 'utf8');
const i = route.indexOf('cleanOnboardingInput(');
ok(i > -1 && i < route.indexOf('createServerClient()') && i < route.indexOf('createServiceClient()'), 'route cleans BEFORE touching the database');
ok(!/request\.json\(\)\)\s*as OnboardingBody/.test(route) && /const requestedSlugs = body\.subjects;/.test(route), 'raw body no longer used; subjects come from the cleaned copy');
ok(/body\.targetDate/.test(route) && /display_name: body\.displayName/.test(route), 'cleaned values are what is saved');
ok(/ONBOARDING_ERROR_TEXT/.test(readFileSync('apps/web/components/HomeClient.tsx', 'utf8')), 'page shows plain sentences');
console.log(`t121: ${n - f}/${n} passed`); if (f) process.exit(1);
