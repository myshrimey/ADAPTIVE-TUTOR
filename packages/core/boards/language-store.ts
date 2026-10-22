import type { SupabaseClient } from '@supabase/supabase-js';
import { BUILTIN_LANGUAGES, cleanPrefs, resolveLanguages, type LangPrefs, type SupportedLanguage } from './languages';

/** Languages the product offers (database table; the built-in English + Hindi list if the table is not there yet). */
export async function loadSupportedLanguages(client: SupabaseClient): Promise<SupportedLanguage[]> {
  try {
    const { data, error } = await client.from('supported_languages').select('code, label, native_label, enabled, script').order('sort');
    if (error || !data?.length) return BUILTIN_LANGUAGES;
    return data as SupportedLanguage[];
  } catch { return BUILTIN_LANGUAGES; }
}

export async function loadLangPrefs(client: SupabaseClient, studentId: string): Promise<LangPrefs> {
  const empty: LangPrefs = { app: null, question: null, learning: null, report: null };
  try {
    const { data, error } = await client.from('learning_profiles').select('app_language, question_language, learning_language, report_language').eq('student_id', studentId).maybeSingle();
    if (error || !data) return empty;
    return { app: data.app_language ?? null, question: data.question_language ?? null, learning: data.learning_language ?? null, report: data.report_language ?? null };
  } catch { return empty; }
}

/** The effective languages for a student. Never throws: any problem means the defaults. */
export async function languagesForStudent(client: SupabaseClient, studentId: string, device: string | null) {
  const [prefs, langs] = await Promise.all([loadLangPrefs(client, studentId), loadSupportedLanguages(client)]);
  return { prefs, ...resolveLanguages(prefs, device, langs), languages: langs };
}

export async function saveLangPrefs(service: SupabaseClient, studentId: string, input: unknown): Promise<LangPrefs> {
  const langs = await loadSupportedLanguages(service);
  const { prefs, error } = cleanPrefs(input, langs);
  if (error) throw new Error(error);
  const { data: existing } = await service.from('learning_profiles').select('student_id').eq('student_id', studentId).maybeSingle();
  const row = { app_language: prefs.app, question_language: prefs.question, learning_language: prefs.learning, report_language: prefs.report };
  const { error: e } = existing ? await service.from('learning_profiles').update(row).eq('student_id', studentId) : await service.from('learning_profiles').insert({ student_id: studentId, ...row });
  if (e) throw new Error('Could not save your language choices.');
  return prefs;
}
