'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useLanguage } from './LanguageProvider';
import { LanguageToggle } from './LanguageToggle';

type Item = { href: string; label: string; desc: string; icon: string };

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { t } = useLanguage();
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [open, setOpen] = useState<null | 'practice' | 'account' | 'mobile'>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  // The student's name should be visible wherever they're signed in, not
  // just on the dashboard — one lightweight profile fetch whenever sign-in
  // state flips to true, cached here for the rest of the page's life.
  useEffect(() => {
    if (!signedIn) {
      setDisplayName(null);
      return;
    }
    fetch('/api/student/profile')
      .then((r) => r.json())
      .then((json) => {
        if (!json.error && json.data?.displayName) setDisplayName(json.data.displayName);
      })
      .catch(() => {});
  }, [signedIn]);

  // Close any open menu when the page changes, on Escape, or on an outside click.
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
    }
    function onClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  // 2-device limit: if this browser is not allowed to use this login, explain why instead of failing page by page.
  useEffect(() => {
    if (!signedIn || pathname.startsWith('/device-limit')) return;
    fetch('/api/device/status')
      .then((r) => r.json())
      .then((j) => {
        if (j.data && j.data.signedIn && j.data.allowed === false) router.push('/device-limit');
      })
      .catch(() => {});
  }, [signedIn, pathname, router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const practice: Item[] = [
    ...(signedIn ? [{ href: '/diagnostic', label: t('nav.takeTest'), desc: t('nav.descTest'), icon: '◎' }] : []),
    ...(signedIn ? [{ href: '/mock', label: t('nav.mock'), desc: t('nav.descMock'), icon: '⏱' }] : []),
    ...(signedIn ? [{ href: '/written', label: t('nav.written'), desc: t('nav.descWritten'), icon: '✎' }] : []),
    { href: '/papers', label: t('nav.pastPapers'), desc: t('nav.descPapers'), icon: '❏' },
  ];

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const practiceActive = practice.some((i) => active(i.href));
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();

  function link(href: string, label: string) {
    return (
      <a href={href} className="nav-link" aria-current={active(href) ? 'page' : undefined}>
        {label}
      </a>
    );
  }

  return (
    <header className="site-header">
      <div className="shell site-header__row" ref={rowRef}>
        <a href="/" className="wordmark">
          <span className="wordmark__mark">∠</span>Sahayak
        </a>

        <nav className="site-header__nav" aria-label="Main">
          {signedIn && link('/dashboard', t('nav.dashboard'))}
          {link('/learn', t('nav.learn'))}

          <div className="nav-menu">
            <button
              type="button"
              className="nav-link nav-link--button"
              aria-expanded={open === 'practice'}
              aria-haspopup="true"
              aria-current={practiceActive ? 'page' : undefined}
              onClick={() => setOpen(open === 'practice' ? null : 'practice')}
            >
              {t('nav.practice')}
              <span className="nav-caret" aria-hidden="true" />
            </button>
            {open === 'practice' && (
              <div className="nav-panel" role="menu">
                {practice.map((i) => (
                  <a key={i.href} href={i.href} className="nav-panel__item" role="menuitem">
                    <span className="nav-panel__icon" aria-hidden="true">{i.icon}</span>
                    <span>
                      <strong>{i.label}</strong>
                      <small>{i.desc}</small>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {signedIn && link('/plan', t('nav.plan'))}
          {link('/progress', t('nav.progress'))}
          {signedIn && link('/report', t('nav.report'))}
        </nav>

        <div className="site-header__right">
          <a href="/pilot" className="nav-cta">{t('nav.pilotOffer')}</a>
          <LanguageToggle />
          {signedIn && (
            <div className="nav-menu">
              <button
                type="button"
                className="nav-avatar"
                aria-expanded={open === 'account'}
                aria-haspopup="true"
                aria-label={t('nav.account')}
                onClick={() => setOpen(open === 'account' ? null : 'account')}
              >
                <span className="nav-avatar__dot">{initial}</span>
                {displayName && <span className="nav-avatar__name">{displayName}</span>}
              </button>
              {open === 'account' && (
                <div className="nav-panel nav-panel--right nav-panel--narrow" role="menu">
                  {displayName && <p className="nav-panel__hello">{t('nav.hi', { name: displayName })}</p>}
                  <a href="/profile" className="nav-panel__row" role="menuitem">{t('nav.profile')}</a>
                  <a href="/dashboard" className="nav-panel__row" role="menuitem">{t('nav.dashboard')}</a>
                  <button type="button" className="nav-panel__row nav-panel__row--quiet" role="menuitem" onClick={handleSignOut}>
                    {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="nav-burger"
            aria-label={t('nav.menu')}
            aria-expanded={open === 'mobile'}
            onClick={() => setOpen(open === 'mobile' ? null : 'mobile')}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {open === 'mobile' && (
        <div className="nav-drawer">
          <div className="shell">
            {signedIn && displayName && <p className="nav-panel__hello">{t('nav.hi', { name: displayName })}</p>}
            {signedIn && <a href="/dashboard" className="nav-drawer__link">{t('nav.dashboard')}</a>}
            <a href="/learn" className="nav-drawer__link">{t('nav.learn')}</a>
            {practice.map((i) => (
              <a key={i.href} href={i.href} className="nav-drawer__link">
                <span aria-hidden="true">{i.icon}</span>
                <span>{i.label}<small>{i.desc}</small></span>
              </a>
            ))}
            {signedIn && <a href="/plan" className="nav-drawer__link">{t('nav.plan')}</a>}
            <a href="/progress" className="nav-drawer__link">{t('nav.progress')}</a>
            {signedIn && <a href="/report" className="nav-drawer__link">{t('nav.report')}</a>}
            {signedIn && <a href="/profile" className="nav-drawer__link">{t('nav.profile')}</a>}
            <a href="/pilot" className="nav-cta nav-cta--block">{t('nav.pilotOffer')}</a>
            {signedIn && (
              <button type="button" className="nav-drawer__link nav-drawer__link--quiet" onClick={handleSignOut}>
                {t('nav.signOut')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
