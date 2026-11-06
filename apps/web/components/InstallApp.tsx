'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { detectPlatform, installAdvice, installMode, isCompactRoute, isIosSafari, type InstallPlatform } from '@adaptive-tutor/core';

// v102: a fixed "Get the app" button on every page (mounted once in layout.tsx), bottom-left (the feedback button is bottom-right).
// It installs Sahayak as a web app on the device. It hides itself when the app is already installed, and is small on test-taking screens.
// Privacy: it records nothing (no click or install counts) and stores nothing about the person; the only thing remembered is, for this
// browser tab only, that "Not now" was pressed.
export function InstallApp() {
  const pathname = usePathname() ?? '/';
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('desktop');
  const [safari, setSafari] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [open, setOpen] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const deferred = useRef<any>(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setPlatform(detectPlatform(ua, navigator.maxTouchPoints || 0));
    setSafari(isIosSafari(ua));
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setStandalone(!!isStandalone);
    try { setSnoozed(sessionStorage.getItem('sahayak_install_snooze') === '1'); } catch { /* storage blocked: fine */ }
    setReady(true);
    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e; setHasPrompt(true); };
    const onInstalled = () => { deferred.current = null; setHasPrompt(false); setStandalone(true); setOpen(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => { /* not fatal */ });
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!ready) return null; // nothing on the server, so no mismatch
  const mode = installMode({ standalone, hasPrompt });
  if (mode === 'installed') return null;
  const advice = installAdvice(platform, mode, safari);
  const compact = isCompactRoute(pathname) || snoozed;

  async function doInstall() {
    const d = deferred.current; if (!d) return;
    try { await d.prompt(); await d.userChoice; } catch { /* cancelled */ }
    deferred.current = null; setHasPrompt(false); setOpen(false);
  }
  function notNow() { try { sessionStorage.setItem('sahayak_install_snooze', '1'); } catch { /* ignore */ } setSnoozed(true); setOpen(false); }

  return (
    <div className="install-app" data-compact={compact ? 'true' : 'false'}>
      {open ? (
        <div className="install-app__panel" role="dialog" aria-modal="false" aria-label={advice.title}>
          <strong className="install-app__title">{advice.title}</strong>
          <ol className="install-app__steps">{advice.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <p className="install-app__note">{advice.note}</p>
          <div className="install-app__actions">
            {mode === 'prompt' ? <button type="button" className="btn btn--accent" onClick={doInstall}>Install</button> : null}
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Close</button>
            <button type="button" className="btn btn--ghost" onClick={notNow} title="Makes the button small until you close this tab">Not now</button>
          </div>
        </div>
      ) : null}
      <button type="button" className="install-app__button" aria-label="Get the Sahayak app: install on this device" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></svg>
        <span className="install-app__label">{advice.button}</span>
      </button>
    </div>
  );
}
