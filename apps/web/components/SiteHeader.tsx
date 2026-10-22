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
  // Role comes from the server (/api/me); the Admin link only ever appears for an admin.
  const [role, setRole] = useState<'admin' | 'teacher' | 'parent' | 'tutor' | 'centre' | 'student' | 'none' | null>(null);
  const isPortal = role === 'parent' || role === 'tutor' || role === 'centre';
  const staff = role === 'admin' || role === 'teacher' || isPortal;
  const portalLabel = role === 'parent' ? 'Parent area' : role === 'tutor' ? 'Tutor area' : role === 'centre' ? 'Centre area' : '';
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
      setRole(null);
      return;
    }
    fetch('/api/me').then((r) => r.json()).then((j) => setRole(j.data?.role ?? 'none')).catch(() => setRole('none'));
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
    ...(signedIn ? [{ href: '/challenge', label: 'Challenges', desc: 'Practice, Challenge, Mixed, Boss Battle', icon: '⚔' }, { href: '/mistakes', label: 'My Mistake Book', desc: 'Review and fix your mistakes', icon: '✓' }, { href: '/achievements', label: 'Achievements', desc: 'What you have earned', icon: '🏅' }, { href: '/journey', label: 'Study journey', desc: 'Where you are in each subject', icon: '➤' }] : []),
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
          <img src="/logo-mark.png" alt="" className="wordmark__img" width={34} height={34} />Sahayak
        </a>

        <nav className="site-header__nav" aria-label="Main">
          {role === 'admin' && link('/admin', 'Admin')}
          {role === 'teacher' && link('/teacher', 'Teacher area')}
          {isPortal && link('/' + role, portalLabel)}
          {staff ? null : <>
          {signedIn && link('/dashboard', t('nav.dashboard'))}
          {signedIn && link('/today', 'Today')}
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
          </>}
        </nav>

        <div className="site-header__right">
          {role === 'admin' && <a href="/admin" className="nav-cta">Admin</a>}
          {!signedIn && <a href="/portals" className="nav-link">Parents &amp; partners</a>}
          {!staff && <a href="/plans" className="nav-cta">{t('nav.pilotOffer')}</a>}
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
                  {role === 'admin' && <a href="/admin" className="nav-panel__row" role="menuitem">Admin dashboard</a>}
                  {role === 'teacher' && <a href="/teacher" className="nav-panel__row" role="menuitem">Teacher area</a>}
                  {isPortal && <a href={'/' + role} className="nav-panel__row" role="menuitem">{portalLabel}</a>}
                  {!staff && <>
                  <a href="/reports" className="nav-panel__row" role="menuitem">My test reports</a>
                  <a href="/sharing" className="nav-panel__row" role="menuitem">Sharing</a>
                  <a href="/profile" className="nav-panel__row" role="menuitem">{t('nav.profile')}</a>
                  <a href="/my-data" className="nav-panel__row" role="menuitem">My data</a>
                  <a href="/dashboard" className="nav-panel__row" role="menuitem">{t('nav.dashboard')}</a>
                  </>}
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
            {role === 'admin' && <a href="/admin" className="nav-drawer__link">Admin dashboard</a>}
            {role === 'teacher' && <a href="/teacher" className="nav-drawer__link">Teacher area</a>}
            {isPortal && <a href={'/' + role} className="nav-drawer__link">{portalLabel}</a>}
            {!signedIn && <a href="/portals" className="nav-drawer__link">Parents &amp; partners</a>}
            {!staff && <>
            {signedIn && <a href="/dashboard" className="nav-drawer__link">{t('nav.dashboard')}</a>}
            {signedIn && <a href="/today" className="nav-drawer__link">Today</a>}
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
            {signedIn && <a href="/reports" className="nav-drawer__link">My test reports</a>}
            {signedIn && <a href="/sharing" className="nav-drawer__link">Sharing</a>}
            {signedIn && <a href="/my-data" className="nav-drawer__link">My data</a>}
            <a href="/plans" className="nav-cta nav-cta--block">{t('nav.pilotOffer')}</a>
            </>}
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
