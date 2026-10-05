'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

// A small sign-in form embedded directly on /admin/feedback, rather than
// sending the admin back to the main "/" page — "/" signs them in but then
// routes to /dashboard or onboarding, not back here, which was the dead end
// the "Sign in with an allowed account" message left people at. Uses the
// same Supabase Auth as the rest of the site; there's no separate admin
// account system (apps/web/app/admin/feedback/page.tsx checks the signed-in
// user's email against ADMIN_EMAILS once this form gets them a session).
export function AdminSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    // Re-run the server component now that a session cookie exists, instead
    // of a client-side route change — this page's admin check happens on
    // the server.
    window.location.reload();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-2)', maxWidth: '360px' }}>
      {error && <p className="alert">{error}</p>}
      <div className="field">
        <label className="field__label" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          className="field__input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          className="field__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn--accent" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
