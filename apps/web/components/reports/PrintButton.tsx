'use client';
import { useState } from 'react';
import { downloadElementAsPdf } from '@/lib/download-pdf';

import type { PrivacyClass } from '@adaptive-tutor/core';
import { BRAND } from '@adaptive-tutor/core';

// v81: both buttons are branded. `classification` says how private the page is (a student's results are confidential; a question paper or the sample report is not).
export function PrintButton({ fileName = 'sahayak-report', title, classification = 'confidential', kind = 'report', curriculum }: { fileName?: string; title?: string; classification?: PrivacyClass; kind?: string; curriculum?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function download(e: React.MouseEvent<HTMLButtonElement>) {
    const root = (e.currentTarget.closest('main') ?? document.body) as HTMLElement;
    setBusy(true); setErr('');
    try { await downloadElementAsPdf(root, fileName, { title, classification, kind, curriculum }); }
    catch { setErr('The PDF could not be made on this device. Please use "Print" and choose "Save as PDF".'); }
    setBusy(false);
  }
  // Print: put the Sahayak header on the top of the printed page, then take it away again. (Page numbers on paper are the browser's own setting.)
  function printBranded() {
    const root = (document.querySelector('main') ?? document.body) as HTMLElement; const el = document.createElement('div'); el.className = 'print-brand';
    el.innerHTML = `<img src="${BRAND.logoPath}" alt="" height="32" /><div><strong>${BRAND.name}</strong><br/><small>${BRAND.tagline} · ${BRAND.website} · ${new Date().toLocaleDateString('en-IN')}</small></div>`;
    root.prepend(el); const done = () => { el.remove(); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print();
  }
  return (
    <span className="no-print" style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="btn btn--small" onClick={download} disabled={busy}>{busy ? 'Making PDF…' : 'Download PDF'}</button>
      <button type="button" className="btn btn--ghost btn--small" onClick={printBranded}>Print</button>
      {err && <span role="alert" style={{ color: 'var(--danger, #b00020)', fontSize: '0.85rem' }}>{err}</span>}
    </span>
  );
}
