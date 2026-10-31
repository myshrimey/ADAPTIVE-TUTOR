import { inflateRawSync } from 'zlib';
import { NODE_KINDS, PARENT_KIND, slug, type NodeKind } from './constants';

export interface DraftNode { key: string; kind: NodeKind; name: string; parentKey: string | null; sequence: number; page: number | null; confidence: number }
export interface Extraction { nodes: DraftNode[]; method: string; note: string; unrecognised: number }
const MAXN = 4000; const MAXNAME = 300;

// ---------- CSV ----------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
const HEAD: Record<string, string> = { unit: 'unit', chapter: 'chapter', topic: 'topic', learning_outcome: 'learning_outcome', outcome: 'learning_outcome', lo: 'learning_outcome', assessment_objective: 'assessment_objective', ao: 'assessment_objective', source_page: 'page', page: 'page' };
class Builder {
  nodes: DraftNode[] = []; private seq = new Map<string, number>(); private keys = new Set<string>();
  add(kind: NodeKind, name: string, parentKey: string | null, page: number | null, confidence: number): string | null {
    name = name.replace(/\s+/g, ' ').trim().slice(0, MAXNAME); if (!name || this.nodes.length >= MAXN) return null;
    const base = (parentKey ? parentKey + '/' : '') + kind + '-' + slug(name); let key = base, n = 2; while (this.keys.has(key)) key = base + '-' + n++;
    // the same name under the same parent twice is kept (flagged later as a duplicate) but gets its own key
    this.keys.add(key); const sk = parentKey ?? '#' + kind; const s = (this.seq.get(sk) ?? 0) + 1; this.seq.set(sk, s);
    this.nodes.push({ key, kind, name, parentKey, sequence: s, page, confidence }); return key;
  }
}
/** Rows → outline. Empty cells carry the previous unit/chapter/topic down, so a topic list needs the chapter written once. */
export function rowsToNodes(rows: string[][]): Extraction {
  if (!rows.length) return { nodes: [], method: 'table', note: 'The table is empty.', unrecognised: 0 };
  const head = rows[0].map((h) => HEAD[h.trim().toLowerCase().replace(/[\s-]+/g, '_')] ?? null);
  if (!head.some((h) => h && h !== 'page')) return { nodes: [], method: 'table', note: 'No usable column names. Use: unit, chapter, topic, learning_outcome, assessment_objective, source_page.', unrecognised: rows.length };
  const b = new Builder(); let unit: string | null = null, chapter: string | null = null, topic: string | null = null; let bad = 0;
  const lastName: Record<string, string> = {};
  for (const r of rows.slice(1)) {
    const g = (k: string) => { const i = head.indexOf(k); return i >= 0 ? (r[i] ?? '').trim() : ''; };
    const page = Number(g('page')); const pg = Number.isInteger(page) && page > 0 ? page : null;
    const u = g('unit'), c = g('chapter'), t = g('topic'), lo = g('learning_outcome'), ao = g('assessment_objective');
    if (!u && !c && !t && !lo && !ao) { bad++; continue; }
    if (u && u !== lastName.unit) { unit = b.add('unit', u, null, pg, 1); lastName.unit = u; chapter = null; topic = null; delete lastName.chapter; delete lastName.topic; }
    if (c && c !== lastName.chapter) { chapter = b.add('chapter', c, unit, pg, 1); lastName.chapter = c; topic = null; delete lastName.topic; }
    if (t && t !== lastName.topic) { topic = b.add('topic', t, chapter, pg, 1); lastName.topic = t; }
    if (lo) b.add('learning_outcome', lo, topic ?? chapter ?? unit, pg, 1);
    if (ao) b.add('assessment_objective', ao, null, pg, 1);
  }
  return { nodes: b.nodes, method: 'table', note: `Read ${b.nodes.length} items from the table.`, unrecognised: bad };
}

// ---------- outline text ----------
const LABELS: [RegExp, NodeKind][] = [
  [/^(?:unit|section)\s*[\w.\-]*\s*[:.\-–—)]\s*(.+)$/i, 'unit'], [/^chapter\s*[\w.\-]*\s*[:.\-–—)]\s*(.+)$/i, 'chapter'], [/^topic\s*[\w.\-]*\s*[:.\-–—)]\s*(.+)$/i, 'topic'],
  [/^(?:learning outcome|lo|outcome)\s*[\w.\-]*\s*[:.\-–—)]\s*(.+)$/i, 'learning_outcome'], [/^(?:assessment objective|ao)\s*[\w.\-]*\s*[:.\-–—)]\s*(.+)$/i, 'assessment_objective'],
];
/** Lines that start with Unit / Chapter / Topic / LO / AO become the outline; anything else is counted and left out (never guessed). A page can be written as [p.12] or (page 12). */
export function parseOutlineText(text: string): Extraction {
  const b = new Builder(); let unit: string | null = null, chapter: string | null = null, topic: string | null = null; let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/\s+/g, ' ').trim(); if (!line) continue;
    let page: number | null = null; const pm = line.match(/\s*[\[(](?:p\.?|pg\.?|page)\s*(\d{1,4})[\])]\s*$/i); if (pm) { page = Number(pm[1]); line = line.slice(0, pm.index).trim(); }
    let hit = false;
    for (const [re, kind] of LABELS) { const m = line.match(re); if (!m) continue; hit = true; const name = m[1];
      if (kind === 'unit') { unit = b.add('unit', name, null, page, 0.9); chapter = null; topic = null; }
      else if (kind === 'chapter') { chapter = b.add('chapter', name, unit, page, 0.9); topic = null; }
      else if (kind === 'topic') topic = b.add('topic', name, chapter ?? unit, page, 0.9);
      else if (kind === 'learning_outcome') b.add('learning_outcome', name, topic ?? chapter ?? unit, page, 0.9);
      else b.add('assessment_objective', name, null, page, 0.9);
      break; }
    if (!hit) skipped++;
  }
  return { nodes: b.nodes, method: 'outline text', note: `Read ${b.nodes.length} labelled lines. ${skipped} other line(s) were not used.`, unrecognised: skipped };
}

// ---------- DOCX / XLSX (zip + XML, no extra library) ----------
export function zipEntry(buf: Buffer, name: string): Buffer | null {
  let eocd = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const fname = buf.toString('utf8', p + 46, p + 46 + nlen);
    if (fname === name) {
      if (usize > 20 * 1024 * 1024) return null; // refuse zip bombs
      const lnlen = buf.readUInt16LE(off + 26), lelen = buf.readUInt16LE(off + 28), start = off + 30 + lnlen + lelen; const data = buf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(data); if (method === 8) { try { return inflateRawSync(data, { maxOutputLength: 20 * 1024 * 1024 }); } catch { return null; } } return null;
    }
    p += 46 + nlen + elen + clen;
  }
  return null;
}
const unxml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');
export function docxToText(buf: Buffer): string | null {
  const x = zipEntry(buf, 'word/document.xml'); if (!x) return null;
  return unxml(x.toString('utf8').replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, ''));
}
export function xlsxToRows(buf: Buffer): string[][] | null {
  const sheet = zipEntry(buf, 'xl/worksheets/sheet1.xml'); if (!sheet) return null;
  const ss = zipEntry(buf, 'xl/sharedStrings.xml'); const strings: string[] = [];
  if (ss) for (const m of ss.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) strings.push(unxml((m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')));
  const col = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const rows: string[][] = [];
  for (const rm of sheet.toString('utf8').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = cm[1].match(/r="([A-Z]+\d+)"/)?.[1]; if (!ref) continue; const t = cm[1].match(/t="(\w+)"/)?.[1]; const inner = cm[2] ?? '';
      let v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ''; if (t === 's') v = strings[Number(v)] ?? ''; else if (t === 'inlineStr') v = unxml((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]) ?? ''); else v = unxml(v);
      row[col(ref)] = v;
    }
    rows.push(Array.from(row, (c) => c ?? '')); if (rows.length > 20000) break;
  }
  return rows;
}
/** One entry point for every supported file. A PDF is stored but NOT read here (no PDF reader is installed): the reviewer pastes the outline or uses the CSV template. */
export function extractFromFile(ext: string, buf: Buffer): Extraction {
  try {
    if (ext === 'csv') return rowsToNodes(parseCsv(buf.toString('utf8')));
    if (ext === 'xlsx') { const r = xlsxToRows(buf); return r ? rowsToNodes(r) : { nodes: [], method: 'xlsx', note: 'Could not read this spreadsheet. Save it as CSV and upload again.', unrecognised: 0 }; }
    if (ext === 'docx') { const t = docxToText(buf); return t ? parseOutlineText(t) : { nodes: [], method: 'docx', note: 'Could not read this document.', unrecognised: 0 }; }
    if (ext === 'pdf') return { nodes: [], method: 'pdf (stored only)', note: 'The PDF is saved privately as the source. Sahayak cannot read PDFs automatically yet: paste the outline text, or fill the CSV template, using the PDF page numbers.', unrecognised: 0 };
  } catch (e: any) { return { nodes: [], method: ext, note: 'Reading this file failed: ' + String(e?.message ?? 'unknown').slice(0, 120), unrecognised: 0 }; }
  return { nodes: [], method: ext, note: 'Unsupported file.', unrecognised: 0 };
}
export { NODE_KINDS, PARENT_KIND };
