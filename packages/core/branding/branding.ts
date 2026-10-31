// v81: ONE place for how every Sahayak document and export is branded. PDFs, printouts and CSV downloads all read from here.
export const BRAND = {
  name: 'Sahayak',
  tagline: 'Measure Your Growth, Master Your Subjects.',
  website: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BRAND_WEBSITE) || 'https://cbse-tutor.vercel.app/',
  logoPath: '/logo.png', // the official logo already in the project (apps/web/public/logo.png); never replaced by a generated one
} as const;
export type PrivacyClass = 'public' | 'general' | 'internal' | 'confidential';
export const PRIVACY_LABEL: Record<PrivacyClass, string> = { public: 'Public', general: 'General: contains no personal information', internal: 'Internal: Sahayak team only', confidential: 'Confidential: contains personal or financial information' };
export interface ExportMeta { id: string; title: string; kind: string; generatedAt: string; classification: PrivacyClass; curriculum?: string | null; note?: string | null; website: string; brand: string; tagline: string }

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'export';
/** A report identifier a person can quote to support: SHK-<date>-<kind>-<4 chars>. The 4 chars come from `salt` (a random value for PDFs, fixed for a day's CSV). */
export function exportId(kind: string, at: Date = new Date(), salt = ''): string {
  const d = at.toISOString().slice(0, 10).replace(/-/g, ''); let h = 0; for (const c of `${kind}|${d}|${salt}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `SHK-${d}-${slug(kind).toUpperCase().slice(0, 12)}-${h.toString(36).toUpperCase().padStart(4, '0').slice(-4)}`;
}
export function makeExportMeta(p: { title: string; kind: string; classification?: PrivacyClass; curriculum?: string | null; note?: string | null; at?: Date; salt?: string }): ExportMeta {
  const at = p.at ?? new Date();
  return { id: exportId(p.kind, at, p.salt ?? ''), title: p.title.slice(0, 120), kind: p.kind, generatedAt: at.toISOString(), classification: p.classification ?? 'internal', curriculum: p.curriculum ?? null, note: p.note ?? null, website: BRAND.website, brand: BRAND.name, tagline: BRAND.tagline };
}
/** A file name with NO personal data: only the kind and the date. */
export function safeFileName(kind: string, ext: string, at: Date = new Date()): string { return `sahayak-${slug(kind)}-${at.toISOString().slice(0, 10)}.${ext.replace(/[^a-z0-9]/gi, '').toLowerCase()}`; }
/** Human-readable companion for a raw CSV. The CSV itself carries no title rows so it stays machine-readable. */
export function metaText(m: ExportMeta, file?: string): string {
  return [`${m.brand}: ${m.tagline}`, m.website, '', `Title: ${m.title}`, file ? `File: ${file}` : null, `Export ID: ${m.id}`, `Generated: ${m.generatedAt}`, `Privacy: ${PRIVACY_LABEL[m.classification]}`, m.curriculum ? `Curriculum: ${m.curriculum}` : null, m.note ? `Note: ${m.note}` : null, '', 'The data file has one header row followed by data rows, UTF-8, comma separated. This note is separate so the data stays easy to load into other tools.'].filter((x) => x !== null).join('\n') + '\n';
}
/** HTTP headers carried by every download. No names, emails or student details are ever put in headers. */
export function exportHeaders(m: ExportMeta, file: string, contentType: string): Record<string, string> {
  return { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${file.replace(/[^A-Za-z0-9._-]/g, '_')}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Sahayak-Export-Id': m.id, 'X-Sahayak-Generated': m.generatedAt, 'X-Sahayak-Privacy': m.classification, 'X-Sahayak-Website': m.website };
}
/** ASCII-only text for the PDF header/footer (the built-in PDF fonts cannot print Devanagari; the page content itself is a picture of the page, so it is unaffected). */
export function asciiOnly(s: string, fallback = 'Sahayak report'): string { const t = s.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim(); return t.length >= 3 ? t.slice(0, 90) : fallback; }
export function pageLabel(n: number, total: number) { return `Page ${n} of ${total}`; }
