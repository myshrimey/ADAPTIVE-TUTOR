// Four INDEPENDENT language choices: app (menus), question (the academic question), learning (tutor explanations and feedback), report (progress and parent reports).
// A language is a row in `supported_languages`; nothing here is limited to English and Hindi except the built-in fallback list.
export type LanguageKind = 'app' | 'question' | 'learning' | 'report';
export const LANGUAGE_KINDS: { kind: LanguageKind; label: string; help: string }[] = [
  { kind: 'app', label: 'App language', help: 'Menus, buttons, navigation, notifications, settings.' },
  { kind: 'question', label: 'Question language', help: 'The language the academic questions are shown in (where a checked version exists).' },
  { kind: 'learning', label: 'Learning language', help: 'Tutor explanations and feedback on your answers.' },
  { kind: 'report', label: 'Report language', help: 'Progress reports, readiness reports and recommendations.' },
];
export interface SupportedLanguage { code: string; label: string; native_label: string; enabled: boolean; script?: string | null }
export const BUILTIN_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English', native_label: 'English', enabled: true, script: 'Latin' },
  { code: 'hi', label: 'Hindi', native_label: 'हिंदी', enabled: true, script: 'Devanagari' },
];
export interface LangPrefs { app: string | null; question: string | null; learning: string | null; report: string | null }
export interface LanguageConflict { kind: LanguageKind | 'device'; code: 'language_not_available' | 'device_differs'; message: string }

const isCode = (v: unknown): v is string => typeof v === 'string' && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(v);

/** Cleans a prefs object from the browser: only known, enabled codes survive; null = follow the default. */
export function cleanPrefs(input: any, languages: SupportedLanguage[] = BUILTIN_LANGUAGES): { prefs: LangPrefs; error: string | null } {
  const ok = new Set(languages.filter((l) => l.enabled).map((l) => l.code));
  const prefs: LangPrefs = { app: null, question: null, learning: null, report: null };
  for (const k of ['app', 'question', 'learning', 'report'] as const) {
    const v = input?.[k];
    if (v === null || v === undefined || v === '') continue;
    if (!isCode(v) || !ok.has(v)) return { prefs, error: `${k} language is not available.` };
    prefs[k] = v;
  }
  return { prefs, error: null };
}

/**
 * What each part of the product should use. Unset question and report choices follow the app language (as before v56); an unset learning language stays English (the tutor has always replied in English). A saved choice that is no longer available is NOT silently swapped:
 * English is used and the conflict is returned so the screen can say so. `device` is the language cookie of this browser.
 */
export function resolveLanguages(prefs: LangPrefs | null, device: string | null, languages: SupportedLanguage[] = BUILTIN_LANGUAGES) {
  const enabled = new Set(languages.filter((l) => l.enabled).map((l) => l.code));
  const conflicts: LanguageConflict[] = [];
  const pick = (kind: LanguageKind, value: string | null | undefined, fallback: string): string => {
    if (!value) return fallback;
    if (enabled.has(value)) return value;
    conflicts.push({ kind, code: 'language_not_available', message: `Your saved ${kind} language (${value}) is not available, so English is used.` });
    return 'en';
  };
  const app = device && enabled.has(device) ? device : pick('app', prefs?.app, 'en');
  if (prefs?.app && device && enabled.has(device) && prefs.app !== device) conflicts.push({ kind: 'device', code: 'device_differs', message: `This device shows the app in ${device}; your saved app language is ${prefs.app}.` });
  return { app, question: pick('question', prefs?.question, app), learning: pick('learning', prefs?.learning, 'en'), report: pick('report', prefs?.report, app), conflicts };
}

export interface QuestionVersion { lang: string; status: string; validation?: { passed?: boolean } | null }
export interface VersionDecision { use: string; label: 'original' | 'checked_by_teacher' | 'ai_translated_validated' | 'ai_translated_unvalidated' | 'fallback_original'; reason: string | null }
/** Which version of a question to show. A version that failed its automatic checks or was rejected is never used; the fallback is stated, never silent. */
export function chooseQuestionVersion(wanted: string, versions: QuestionVersion[], original = 'en'): VersionDecision {
  if (!wanted || wanted === original) return { use: original, label: 'original', reason: null };
  const v = versions.find((x) => x.lang === wanted);
  if (!v) return { use: original, label: 'fallback_original', reason: 'No version in this language exists yet.' };
  if (v.status === 'rejected') return { use: original, label: 'fallback_original', reason: 'The version in this language was rejected by a reviewer.' };
  if (v.validation && v.validation.passed === false) return { use: original, label: 'fallback_original', reason: 'The version in this language failed its automatic checks.' };
  if (v.status === 'teacher_checked') return { use: wanted, label: 'checked_by_teacher', reason: null };
  return v.validation?.passed === true ? { use: wanted, label: 'ai_translated_validated', reason: null } : { use: wanted, label: 'ai_translated_unvalidated', reason: null };
}
export const VERSION_LABEL_TEXT: Record<VersionDecision['label'], string> = {
  original: '', checked_by_teacher: 'Checked by a teacher', ai_translated_validated: 'AI translation, passed automatic checks, not yet checked by a teacher',
  ai_translated_unvalidated: 'AI translation, not yet checked', fallback_original: 'Shown in the original language',
};

/** The line added to AI prompts so replies come back in the learning language. Numbers, symbols and formulas are never changed. */
export function languageInstruction(code: string | null | undefined, languages: SupportedLanguage[] = BUILTIN_LANGUAGES): string {
  if (!code || code === 'en') return '';
  const l = languages.find((x) => x.code === code);
  if (!l) return '';
  return `Reply language: ${l.label}${l.script ? ` (${l.script} script)` : ''}, in simple words a 15-year-old can follow. Keep numbers, signs, units, symbols, chemical formulas and variable names exactly as they are. If you are not sure of a ${l.label} term, write the English term in brackets.`;
}

/** Share of letters that are Devanagari (0-1). Used to guess the language of a handwritten transcription when the AI did not say. */
export function devanagariShare(text: string): number {
  const letters = (text.match(/[A-Za-zऀ-ॿ]/g) ?? []);
  if (!letters.length) return 0;
  return letters.filter((c) => c >= 'ऀ' && c <= 'ॿ').length / letters.length;
}
export type AnswerLanguage = 'en' | 'hi' | 'mixed' | 'other' | 'unknown';
export function detectAnswerLanguage(claimed: unknown, transcription: string): AnswerLanguage {
  const c = String(claimed ?? '').toLowerCase();
  const share = devanagariShare(transcription ?? '');
  const fromText: AnswerLanguage = !transcription?.trim() ? 'unknown' : share > 0.7 ? 'hi' : share > 0.1 ? 'mixed' : 'en';
  if (c === 'hi' || c === 'hindi') return fromText === 'en' ? 'mixed' : 'hi';
  if (c === 'mixed') return 'mixed';
  if (c === 'other') return 'other';
  if (c === 'en' || c === 'english') return share > 0.1 ? (share > 0.7 ? 'hi' : 'mixed') : 'en';
  return fromText;
}
