'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Sends one anonymous page-view note per page. No cookie, no personal data; the server drops bots, admin pages and "Do Not Track".
export function TrackPageView() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    try {
      if (navigator.doNotTrack === '1') return;
      const q = new URLSearchParams(window.location.search);
      let referrerHost = '';
      try { if (document.referrer) referrerHost = new URL(document.referrer).hostname; } catch { /* ignore */ }
      const body = JSON.stringify({ path: pathname, referrerHost, utmSource: q.get('utm_source') || q.get('src') || q.get('ref') || '', utmMedium: q.get('utm_medium') || '', utmCampaign: q.get('utm_campaign') || '' });
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch { /* never block the page */ }
  }, [pathname]);
  return null;
}
