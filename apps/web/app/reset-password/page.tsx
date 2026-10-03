'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The reset-password email link lands here with the recovery token in the
    // URL hash fragment; supabase-js parses it automatically (browser client
    // has detectSessionInUrl on by default) and fires PASSWORD_RECOVERY once
    // it's done. If neither that event nor an existing session ever shows up,
    // the link was invalid, expired, or already used.
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkInvalid(true);
        return r;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Set a new password</h1>

        {linkInvalid && (
          <p className="alert">
            This reset link is invalid or has expired. Go back to the home page and request a new one.
          </p>
        )}

        {!ready && !linkInvalid && <p style={{ color: 'var(--slate)' }}>Checking your link…</p>}

        {ready && !done && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                className="field__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="field__input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && <p className="alert">{error}</p>}
            <button type="submit" className="btn btn--accent" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {done && <p style={{ color: 'var(--mastered)' }}>Password updated — taking you to your dashboard…</p>}
      </div>
    </main>
  );
}
