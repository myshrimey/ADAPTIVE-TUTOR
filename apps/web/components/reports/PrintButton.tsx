'use client';
import { useState } from 'react';
import { downloadElementAsPdf } from '@/lib/download-pdf';

export function PrintButton({ fileName = 'sahayak-report' }: { fileName?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function download(e: React.MouseEvent<HTMLButtonElement>) {
    const root = (e.currentTarget.closest('main') ?? document.body) as HTMLElement;
    setBusy(true); setErr('');
    try { await downloadElementAsPdf(root, fileName); }
    catch { setErr('The PDF could not be made on this device. Please use "Print" and choose "Save as PDF".'); }
    setBusy(false);
  }
  return (
    <span className="no-print" style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="btn btn--small" onClick={download} disabled={busy}>{busy ? 'Making PDF…' : 'Download PDF'}</button>
      <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>Print</button>
      {err && <span role="alert" style={{ color: 'var(--danger, #b00020)', fontSize: '0.85rem' }}>{err}</span>}
    </span>
  );
}
