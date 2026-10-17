'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useLanguage } from './LanguageProvider';
import { LanguageToggle } from './LanguageToggle';

export function SiteHeader() {
  const router = useRouter();
  const { t } = useLanguage();
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="shell site-header__row">
        <a href="/" className="wordmark">
          <span className="wordmark__mark">∠</span>Sahayak
        </a>
        <nav className="site-header__nav">
          {signedIn && displayName && <span className="site-header__name">{t('nav.hi', { name: displayName })}</span>}
          {signedIn && <a href="/dashboard">{t('nav.dashboard')}</a>}
          <a href="/progress">{t('nav.progress')}</a>
          <a href="/learn">{t('nav.learn')}</a>
          <a href="/papers">{t('nav.pastPapers')}</a>
          {signedIn && <a href="/mock">{t('nav.mock')}</a>}
          {signedIn && <a href="/written">Written</a>}
          {signedIn && <a href="/report">{t('nav.report')}</a>}
          {signedIn && <a href="/profile">{t('nav.profile')}</a>}
          <a href="/pilot">{t('nav.pilotOffer')}</a>
          {signedIn && (
            <a href="/diagnostic" className="site-header__diagnostic-link">
              {t('nav.takeTest')}
            </a>
          )}
          {signedIn && (
            <button
              type="button"
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
            >
              {t('nav.signOut')}
            </button>
          )}
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}
