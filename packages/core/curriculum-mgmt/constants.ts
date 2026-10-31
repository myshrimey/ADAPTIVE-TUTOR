// v81: curriculum management. Nothing here invents syllabus facts: it only structures what a person uploads or types, and keeps the source page.
export const NODE_KINDS = ['unit', 'chapter', 'topic', 'learning_outcome', 'assessment_objective'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];
export const NODE_LABEL: Record<NodeKind, string> = { unit: 'Unit', chapter: 'Chapter', topic: 'Topic', learning_outcome: 'Learning outcome', assessment_objective: 'Assessment objective' };
export const PARENT_KIND: Record<NodeKind, NodeKind | null> = { unit: null, chapter: 'unit', topic: 'chapter', learning_outcome: 'topic', assessment_objective: null };
export const DOC_TYPES = ['syllabus', 'curriculum_framework', 'exam_blueprint', 'textbook_index', 'other'] as const;
export const DOC_TYPE_LABEL: Record<string, string> = { syllabus: 'Syllabus', curriculum_framework: 'Curriculum framework', exam_blueprint: 'Exam blueprint / paper design', textbook_index: 'Textbook contents page', other: 'Other' };
export const VERSION_STATUS_LABEL: Record<string, string> = { draft: 'Draft', uploaded: 'Uploaded', processing: 'Processing', needs_review: 'Needs review', approved: 'Approved', published: 'Published', superseded: 'Superseded', failed: 'Failed', retired: 'Retired' };
/** Versions whose outline may still be edited. Approved, published and superseded outlines are frozen so history cannot change. */
export const EDITABLE_STATUSES = ['draft', 'uploaded', 'needs_review', 'failed'] as const;
export const CURR_MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel serverless request bodies are limited to about 4.5 MB
export const ALLOWED_EXT: Record<string, string[]> = { pdf: ['application/pdf'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'] };
export const CSV_TEMPLATE = 'unit,chapter,topic,learning_outcome,assessment_objective,source_page\n';

const clean = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
export interface UploadMeta { board: string; academic_year: string; class_level: string; subject: string; language: string; doc_type: string; source_url?: string; source_note?: string; source_date?: string }
export function validateUploadMeta(m: any): { ok: true; value: UploadMeta } | { ok: false; error: string } {
  const board = clean(m?.board || 'CBSE', 40), year = clean(m?.academic_year, 9), cls = clean(m?.class_level, 10), subject = clean(m?.subject, 80), language = clean(m?.language || 'en', 10);
  if (!board) return { ok: false, error: 'Board is required.' };
  if (!/^\d{4}-\d{2,4}$/.test(year)) return { ok: false, error: 'Academic year looks like 2026-27.' };
  if (!cls) return { ok: false, error: 'Class is required.' };
  if (!subject) return { ok: false, error: 'Subject is required.' };
  const doc_type = (DOC_TYPES as readonly string[]).includes(m?.doc_type) ? m.doc_type : 'syllabus';
  const source_url = clean(m?.source_url, 300); if (source_url && !/^https?:\/\/\S+$/i.test(source_url)) return { ok: false, error: 'The source address must start with http:// or https://.' };
  const source_note = clean(m?.source_note, 300); if (!source_url && !source_note) return { ok: false, error: 'Please give the official source: an address or a short description (for example the document title and year).' };
  const sd = clean(m?.source_date, 10); if (sd && !/^\d{4}-\d{2}-\d{2}$/.test(sd)) return { ok: false, error: 'Source date looks like 2026-04-01.' };
  return { ok: true, value: { board, academic_year: year, class_level: cls, subject, language, doc_type, source_url: source_url || undefined, source_note: source_note || undefined, source_date: sd || undefined } };
}
/** File checks by name, size AND the first bytes (a renamed file is refused). */
export function validateFile(f: { name: string; size: number; head: Uint8Array }): { ok: true; ext: string } | { ok: false; error: string } {
  const ext = (f.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT[ext]) return { ok: false, error: 'Please upload a PDF, DOCX, XLSX or CSV file.' };
  if (f.size <= 0) return { ok: false, error: 'The file is empty.' };
  if (f.size > CURR_MAX_UPLOAD_BYTES) return { ok: false, error: 'The file is larger than 4 MB. Please split it, or use the CSV template.' };
  const h = f.head; const is = (...b: number[]) => b.every((x, i) => h[i] === x);
  if (ext === 'pdf' && !is(0x25, 0x50, 0x44, 0x46)) return { ok: false, error: 'This does not look like a real PDF.' };
  if ((ext === 'docx' || ext === 'xlsx') && !is(0x50, 0x4b, 0x03, 0x04)) return { ok: false, error: `This does not look like a real ${ext.toUpperCase()} file.` };
  if (ext === 'csv' && Array.from(h.slice(0, 512)).some((x) => x === 0)) return { ok: false, error: 'This does not look like a text CSV file.' };
  return { ok: true, ext };
}
export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
