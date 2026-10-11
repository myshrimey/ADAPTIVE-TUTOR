'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export function SiteHeader() {
  const router = useRouter();
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
          {signedIn && displayName && <span className="site-header__name">Hi, {displayName}</span>}
          {signedIn && <a href="/dashboard">Dashboard</a>}
          <a href="/progress">Progress</a>
          <a href="/learn">Learn</a>
          <a href="/papers">Past Papers</a>
          {signedIn && <a href="/profile">Profile</a>}
          {signedIn && (
            <a href="/diagnostic" className="site-header__diagnostic-link">
              Take a test
            </a>
          )}
          {signedIn && (
            <button
              type="button"
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
