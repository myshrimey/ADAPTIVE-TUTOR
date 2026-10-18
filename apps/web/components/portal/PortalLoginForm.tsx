'use client';

import { useState } from 'react';
import { PORTAL_ERROR_TEXT, portalHome } from '@adaptive-tutor/core';

const WHERE: Record<string, string> = { student: '/ (the home page)', teacher: '/teacher/login', parent: '/parent/login', tutor: '/tutor/login', centre: '/centre/login' };

// Sign-in page body for one kind of account. A wrong kind of account is turned away with a pointer to the right page.
export function PortalLoginForm({ portal, label, registerHref }: { portal: 'parent' | 'tutor' | 'centre' | 'teacher'; label: string; registerHref: string }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password, portal }) });
      const json = await res.json();
      if (json.error === 'wrong_portal') setError(`This account is not a ${label.toLowerCase()} account. Use the sign-in page at ${WHERE[json.data?.role] ?? '/'}.`);
      else if (json.error) setError(PORTAL_ERROR_TEXT[json.error] ?? 'Could not sign in.');
      else { window.location.href = portalHome(json.data?.role ?? portal); return; }
    } catch {
      setError('Could not reach the server. Check your internet and try again.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{label} sign in</h1>
      <div className="field"><label className="field__label" htmlFor="li">Username or email</label><input id="li" className="field__input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" autoCapitalize="none" /></div>
      <div className="field">
        <label className="field__label" htmlFor="lp">Password</label>
        <input id="lp" type={show ? 'text' : 'password'} className="field__input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <div style={{ fontSize: '0.88rem', marginTop: '0.3rem' }}><a href="#" onClick={(ev) => { ev.preventDefault(); setShow(!show); }}>{show ? 'Hide' : 'Show'} password</a></div>
      </div>
      {error && <p className="alert">{error}</p>}
      <button className="btn btn--accent" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>New here? <a href={registerHref}>Create a {label.toLowerCase()} account</a>. Students sign in on the <a href="/">home page</a>.</p>
    </form>
  );
}
