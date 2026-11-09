// v116: what may be uploaded to the shared paper library (a PUBLIC bucket: anyone can open a file once it is there).
// Pure rules, used by the page (friendly message), the save route (the real check) and mirrored by the bucket settings in migration 0062.
export const PAPER_MAX_BYTES = 10 * 1024 * 1024;
// PDF only: the page only ever offered PDFs, and every extra type is more to go wrong on a public bucket.
export const PAPER_ALLOWED_TYPES = ['application/pdf'] as const;
const EXT_OK = /\.pdf$/i;
const EXT_TYPE: Record<string, string> = { pdf: 'application/pdf' };

export type PaperFileCheck = { ok: true } | { ok: false; code: 'paper_file_empty' | 'paper_file_too_big' | 'paper_file_type' };
/** Checks a chosen file by name, declared type and size (before upload). The bucket enforces the same limits on the server. */
export function checkPaperFile(f: { name: string; type: string; size: number }): PaperFileCheck {
  if (!f || !(f.size > 0)) return { ok: false, code: 'paper_file_empty' };
  if (f.size > PAPER_MAX_BYTES) return { ok: false, code: 'paper_file_too_big' };
  const ext = (f.name.match(EXT_OK) ?? [''])[0].slice(1).toLowerCase();
  if (!ext || !(PAPER_ALLOWED_TYPES as readonly string[]).includes(f.type) || EXT_TYPE[ext] !== f.type) return { ok: false, code: 'paper_file_type' };
  return { ok: true };
}
export const PAPER_FILE_MESSAGE: Record<string, string> = {
  paper_file_empty: 'That file looks empty. Please choose the paper again.',
  paper_file_too_big: 'Each file needs to be under 10MB.',
  paper_file_type: 'Please upload a PDF file.',
};

// Shape the page makes: <subject-slug>/<timestamp>-[solutions-]<safe name>.pdf
const PATH_OK = /^[a-z0-9][a-z0-9-]{0,59}\/\d{10,16}-(solutions-)?[A-Za-z0-9._-]{1,150}\.pdf$/i;
export type PaperMetaCheck = { ok: true } | { ok: false; code: 'missing_required_fields' | 'paper_title_invalid' | 'paper_notes_invalid' | 'paper_year_invalid' | 'paper_path_invalid' };
/** The real check on the save route: a person cannot save a row that points anywhere except a file the page could have made. */
export function checkPaperMeta(m: { title?: unknown; year?: unknown; filePath?: unknown; solutionFilePath?: unknown; notes?: unknown }): PaperMetaCheck {
  if (typeof m.title !== 'string' || typeof m.filePath !== 'string' || !m.title.trim() || !m.filePath) return { ok: false, code: 'missing_required_fields' };
  if (m.title.length > 150) return { ok: false, code: 'paper_title_invalid' };
  if (m.notes != null && (typeof m.notes !== 'string' || m.notes.length > 500)) return { ok: false, code: 'paper_notes_invalid' };
  if (m.year != null && !(Number.isInteger(m.year) && (m.year as number) >= 1990 && (m.year as number) <= 2100)) return { ok: false, code: 'paper_year_invalid' };
  if (!PATH_OK.test(m.filePath) || m.filePath.includes('..')) return { ok: false, code: 'paper_path_invalid' };
  if (m.solutionFilePath != null && (typeof m.solutionFilePath !== 'string' || !PATH_OK.test(m.solutionFilePath) || m.solutionFilePath.includes('..'))) return { ok: false, code: 'paper_path_invalid' };
  return { ok: true };
}
