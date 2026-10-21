// Client-side only: turns a page section into a multi-page A4 PDF the person can save or share.
export async function downloadElementAsPdf(root: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(root, {
    scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
    ignoreElements: (el) => el.classList?.contains('no-print') ?? false,
    onclone: (doc) => { doc.querySelectorAll('.pdf-only').forEach((n) => ((n as HTMLElement).style.display = 'block')); },
  });
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
  const margin = 28, usableW = pageW - margin * 2, usableH = pageH - margin * 2;
  const scale = usableW / canvas.width;
  const sliceH = Math.floor(usableH / scale);
  let y = 0, page = 0;
  while (y < canvas.height) {
    const h = Math.min(sliceH, canvas.height - y);
    const part = document.createElement('canvas');
    part.width = canvas.width; part.height = h;
    part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, usableW, h * scale);
    y += h; page++;
  }
  const safe = fileName.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  pdf.save(`${safe}.pdf`);
}
