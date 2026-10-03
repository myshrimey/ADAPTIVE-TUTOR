'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export function SiteHeader() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

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
          <a href="/dashboard">Progress</a>
          <a href="/learn">Learn</a>
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
