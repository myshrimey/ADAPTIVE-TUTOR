import { BRAND, makeExportMeta, asciiOnly, pageLabel, PRIVACY_LABEL, type PrivacyClass } from '@adaptive-tutor/core';

export interface PdfBranding { title?: string; kind?: string; classification?: PrivacyClass; curriculum?: string | null }
async function loadLogo(): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = BRAND.logoPath;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('logo')); setTimeout(() => rej(new Error('logo timeout')), 4000); });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d')!.drawImage(img, 0, 0);
    return { data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight };
  } catch { return null; } // a missing logo never blocks the download: the header falls back to the brand name
}
// Client-side only: turns a page section into a multi-page A4 PDF the person can save or share.
// v81: every page now has the Sahayak header (logo, name, tagline) and footer (website, export ID, date, privacy level, page n of N).
export async function downloadElementAsPdf(root: HTMLElement, fileName: string, brand: PdfBranding = {}): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }, logo] = await Promise.all([import('html2canvas'), import('jspdf'), loadLogo()]);
  const canvas = await html2canvas(root, {
    scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
    ignoreElements: (el) => el.classList?.contains('no-print') ?? false,
    onclone: (doc) => { doc.querySelectorAll('.pdf-only').forEach((n) => ((n as HTMLElement).style.display = 'block')); },
  });
  const meta = makeExportMeta({ title: asciiOnly(brand.title ?? document.title.replace(/\s*[|·–-]\s*Sahayak.*$/i, '')), kind: brand.kind ?? 'report', classification: brand.classification ?? 'confidential', curriculum: brand.curriculum ?? null, salt: String(Math.random()) });
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
  const margin = 28, top = 62, bottom = 50, usableW = pageW - margin * 2, usableH = pageH - top - bottom;
  const scale = usableW / canvas.width; const sliceH = Math.floor(usableH / scale);
  const pages = Math.max(1, Math.ceil(canvas.height / sliceH));
  let y = 0, page = 0;
  while (y < canvas.height || page === 0) {
    const h = Math.min(sliceH, canvas.height - y);
    const part = document.createElement('canvas'); part.width = canvas.width; part.height = Math.max(1, h);
    part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, top, usableW, h * scale);
    // header
    let tx = margin; if (logo) { const lh = 28, lw = (logo.w / logo.h) * lh; pdf.addImage(logo.data, 'PNG', margin, 14, lw, lh); tx = margin + lw + 10; }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(20, 30, 50); pdf.text(BRAND.name, tx, 28);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(90, 100, 115); pdf.text(BRAND.tagline, tx, 40);
    pdf.setFontSize(9); pdf.setTextColor(20, 30, 50); pdf.text(meta.title, pageW - margin, 28, { align: 'right' });
    pdf.setDrawColor(200, 205, 215); pdf.line(margin, 52, pageW - margin, 52);
    // footer
    pdf.line(margin, pageH - 40, pageW - margin, pageH - 40); pdf.setFontSize(7.5); pdf.setTextColor(90, 100, 115);
    pdf.text(`${BRAND.website}  ·  ID ${meta.id}  ·  Generated ${meta.generatedAt.slice(0, 10)}`, margin, pageH - 28);
    pdf.text(pageLabel(page + 1, pages), pageW - margin, pageH - 28, { align: 'right' });
    pdf.text(PRIVACY_LABEL[meta.classification] + (meta.curriculum ? `  ·  Curriculum: ${asciiOnly(meta.curriculum, '')}` : ''), margin, pageH - 17);
    y += Math.max(h, 1); page++; if (h <= 0) break;
  }
  const safe = fileName.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  pdf.setProperties({ title: meta.title, subject: `${BRAND.name} export ${meta.id}`, creator: BRAND.name, author: BRAND.name });
  pdf.save(`${safe}.pdf`);
}
