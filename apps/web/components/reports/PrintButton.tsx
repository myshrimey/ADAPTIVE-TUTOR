'use client';
export function PrintButton() {
  return <button type="button" className="btn btn--ghost btn--small no-print" onClick={() => window.print()}>Print or save as PDF</button>;
}
