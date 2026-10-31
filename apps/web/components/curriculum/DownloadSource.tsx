'use client';
export function DownloadSource({ docId }: { docId: string }) {
  async function go() { const r = await fetch('/api/admin/curriculum?download=' + docId).then((x) => x.json()).catch(() => null); if (r?.data?.url) window.open(r.data.url, '_blank', 'noopener'); else alert('The original file could not be opened.'); }
  return <button type="button" className="btn" onClick={go}>Open original (private link, 1 minute)</button>;
}
