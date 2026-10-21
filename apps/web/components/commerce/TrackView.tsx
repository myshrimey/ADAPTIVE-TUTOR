'use client';
import { useEffect } from 'react';

export function track(event: string, extra: Record<string, unknown> = {}) {
  try { fetch('/api/commerce/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, ...extra }), keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}
/** Fires one commercial event when the page is shown. */
export function TrackView({ event, productCode, source }: { event: string; productCode?: string; source?: string }) {
  useEffect(() => { track(event, { productCode, source }); }, [event, productCode, source]);
  return null;
}
