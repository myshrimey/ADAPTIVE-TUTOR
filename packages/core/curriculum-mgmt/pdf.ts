// v83: read the TEXT of a PDF (no OCR). Server-only. Uses the `unpdf` package (pdf.js without native parts, works on Vercel).
// Only lines that start with Unit / Section / Chapter / Topic / Learning outcome / Assessment objective become outline items;
// every other line is counted and left out (never guessed). The PDF page number is attached to each item that has none.
// A scanned PDF (pictures of pages, no text) gives no text: the reviewer is told so and pastes the outline instead.
import { parseOutlineText, type Extraction } from './parse';

export const PDF_MAX_PAGES = 150;
export const PDF_MAX_CHARS = 1_500_000;
export const PDF_TIME_LIMIT_MS = 25_000;
const HEADING = /^(?:(?:unit|section|chapter|topic|learning outcome|lo|outcome|assessment objective|ao)\s*[\w.\-]*\s*[:.\-–—)]\s*\S|(?:unit|section|chapter|topic)\s+(?:\d{1,3}|[ivxlc]{1,6})\s+[A-Z\u0900-\u097F][^.]{2,})/i;
const HAS_PAGE = /[\[(](?:p\.?|pg\.?|page)\s*\d{1,4}[\])]\s*$/i;

/** Pure: turn page texts into outline text, adding [p.N] to each heading line that has no page mark of its own. */
export function pagesToOutlineText(pages: string[]): string {
  const out: string[] = [];
  pages.forEach((t, i) => {
    for (const raw of String(t ?? '').split(/\r?\n/)) {
      const line = raw.replace(/\s+/g, ' ').trim(); if (!line) continue;
      out.push(HEADING.test(line) && !HAS_PAGE.test(line) ? `${line} [p.${i + 1}]` : line);
    }
  });
  return out.join('\n');
}

export async function readPdfPages(buf: Buffer): Promise<{ pages: string[]; totalPages: number } | { error: string }> {
  try {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const run = (async () => {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const total = pdf.numPages;
      const { text } = await extractText(pdf, { mergePages: false });
      return { total, text: (Array.isArray(text) ? text : [String(text)]).slice(0, PDF_MAX_PAGES) as string[] };
    })();
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Reading took too long.')), PDF_TIME_LIMIT_MS));
    const r = await Promise.race([run, timeout]);
    return { pages: r.text, totalPages: r.total };
  } catch (e: any) {
    return { error: String(e?.message ?? 'unreadable').slice(0, 120) };
  }
}

export async function extractFromPdf(buf: Buffer): Promise<Extraction> {
  const r = await readPdfPages(buf);
  if ('error' in r) return { nodes: [], method: 'pdf (could not read)', note: `The PDF is saved privately as the source, but its text could not be read (${r.error}). Paste the outline text or use the CSV template.`, unrecognised: 0 };
  const chars = r.pages.reduce((n, p) => n + p.length, 0);
  if (chars < 20) return { nodes: [], method: 'pdf (no text)', note: 'This PDF has no readable text (it looks like scanned pictures of pages). It is saved privately as the source. Paste the outline text or use the CSV template, using the PDF page numbers.', unrecognised: 0 };
  const cut = r.pages.reduce((n, p) => n + p.length, 0) > PDF_MAX_CHARS;
  const text = pagesToOutlineText(r.pages).slice(0, PDF_MAX_CHARS);
  const ex = parseOutlineText(text);
  // text read from a PDF is less certain than a typed table: lower confidence so the review screen asks for a check
  for (const n of ex.nodes) n.confidence = Math.min(n.confidence, 0.7);
  const extra = (r.totalPages > PDF_MAX_PAGES ? ` Only the first ${PDF_MAX_PAGES} of ${r.totalPages} pages were read.` : '') + (cut ? ' The text was cut at the size limit.' : '');
  if (!ex.nodes.length) return { ...ex, method: 'pdf text', note: `The PDF text was read (${r.pages.length} page(s)) but no line started with Unit / Chapter / Topic / Learning outcome / Assessment objective, so nothing was added. Paste the outline text or use the CSV template.${extra}`, unrecognised: ex.unrecognised };
  return { ...ex, method: 'pdf text', note: `Read from the PDF text (${r.pages.length} page(s)): ${ex.nodes.length} labelled lines, ${ex.unrecognised} other line(s) not used. Check every item against the page number shown.${extra}`, unrecognised: ex.unrecognised };
}

/** One entry point for every supported file, including PDF. */
export async function extractFromFileAsync(ext: string, buf: Buffer): Promise<Extraction> {
  if (ext === 'pdf') { try { return await extractFromPdf(buf); } catch (e: any) { return { nodes: [], method: 'pdf', note: 'Reading this PDF failed: ' + String(e?.message ?? 'unknown').slice(0, 100), unrecognised: 0 }; } }
  const { extractFromFile } = await import('./parse');
  return extractFromFile(ext, buf);
}
