// v100: recording the founder's manual test results. Rules only (no database here).
// A recorded result is the founder's own evidence. It never changes a requirement's status or an acceptance by itself.
import { QA_CHECKLISTS, QA_KINDS, type QaKind } from './qa';

export const QA_RESULT_VALUES = ['pass', 'fail', 'blocked'] as const;
export type QaResultValue = (typeof QA_RESULT_VALUES)[number];
export const QA_RESULT_LABEL: Record<QaResultValue | 'untried', string> = { pass: 'Worked', fail: 'Did not work', blocked: 'Could not try', untried: 'Not tried yet' };
export const QA_NOTE_MAX = 500;
export interface QaResultRow { item_id: string; result: QaResultValue; note: string | null; app_version: string | null; tested_at: string }

const ALL_IDS = new Set(QA_KINDS.flatMap((k) => QA_CHECKLISTS[k].map((i) => i.id)));
export const isQaItemId = (id: unknown): id is string => typeof id === 'string' && ALL_IDS.has(id);

/** Anything that looks like a way to reach or name a person is refused, so the note stays about the product. */
const PERSONAL = /[\w.+-]+@[\w-]+\.[\w.]+|(?:\+?\d[\s-]?){9,}/;

export function parseQaResult(raw: any): { ok: true; value: { itemId: string; result: QaResultValue; note: string | null; appVersion: string | null } } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'bad_request' };
  if (!isQaItemId(raw.itemId)) return { ok: false, error: 'unknown_item' };
  if (!QA_RESULT_VALUES.includes(raw.result)) return { ok: false, error: 'bad_result' };
  const note = typeof raw.note === 'string' ? raw.note.trim() : '';
  if (note.length > QA_NOTE_MAX) return { ok: false, error: 'note_too_long' };
  if (PERSONAL.test(note)) return { ok: false, error: 'note_has_contact_details' };
  const v = typeof raw.appVersion === 'string' ? raw.appVersion.trim() : '';
  if (v && !/^v\d{1,4}$/.test(v)) return { ok: false, error: 'bad_version' };
  return { ok: true, value: { itemId: raw.itemId, result: raw.result, note: note || null, appVersion: v || null } };
}

/** Newest row per item (rows may come in any order). */
export function latestByItem(rows: QaResultRow[]): Map<string, QaResultRow> {
  const m = new Map<string, QaResultRow>();
  for (const r of rows ?? []) { if (!isQaItemId(r?.item_id)) continue; const cur = m.get(r.item_id); if (!cur || String(r.tested_at) > String(cur.tested_at)) m.set(r.item_id, r); }
  return m;
}

export interface QaSummary { kind: QaKind; total: number; pass: number; fail: number; blocked: number; untried: number }
export function summariseQa(rows: QaResultRow[]): QaSummary[] {
  const latest = latestByItem(rows);
  return QA_KINDS.map((kind) => {
    const items = QA_CHECKLISTS[kind]; const s: QaSummary = { kind, total: items.length, pass: 0, fail: 0, blocked: 0, untried: 0 };
    for (const i of items) { const r = latest.get(i.id); if (!r) s.untried++; else s[r.result]++; }
    return s;
  });
}

/** Read the history. Returns null when the table cannot be read (for example migration 0059 is not applied yet). */
export async function loadQaResults(service: any, limit = 2000): Promise<QaResultRow[] | null> {
  try {
    const { data, error } = await service.from('qa_results').select('item_id, result, note, app_version, tested_at').order('tested_at', { ascending: false }).limit(limit);
    if (error) return null;
    return (data ?? []) as QaResultRow[];
  } catch { return null; }
}
export async function saveQaResult(service: any, v: { itemId: string; result: QaResultValue; note: string | null; appVersion: string | null }, by: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service.from('qa_results').insert({ item_id: v.itemId, result: v.result, note: v.note, app_version: v.appVersion, tested_by: by });
    if (error) return { ok: false, error: /does not exist|schema cache|42P01|PGRST205/i.test(`${error.code ?? ''} ${error.message ?? ''}`) ? 'tables_missing' : 'save_failed' };
    return { ok: true };
  } catch { return { ok: false, error: 'save_failed' }; }
}
