'use client';

import { useState } from 'react';
import { generateReadablePassword, PORTAL_INFO, PORTAL_ERROR_TEXT, type PortalRole } from '@adaptive-tutor/core';

// Sign-up page body for one kind of account. Each role has its own page and its own wording.
export function PortalRegisterForm({ role }: { role: PortalRole }) {
  const info = PORTAL_INFO[role];
  const [f, setF] = useState({ displayName: '', contactName: '', city: '', qualification: '', subjects: '', username: '', email: '', password: '', website: '' });
  const [consent, setConsent] = useState(false);
  const [addChild, setAddChild] = useState(false);
  const [child, setChild] = useState({ displayName: '', username: '', password: '', email: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { needsApproval: boolean; family?: boolean }>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const nameLabel = role === 'centre' ? 'Name of the coaching centre' : 'Your name';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const family = role === 'parent' && addChild;
      const res = family
        ? await fetch('/api/auth/register-family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent: { displayName: f.displayName, username: f.username, password: f.password, email: f.email }, student: child, consent, website: f.website }) })
        : await fetch('/api/portal/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, role, consent }) });
      const json = await res.json();
      if (json.error) setError(PORTAL_ERROR_TEXT[json.error] ?? 'Something went wrong. Please try again.');
      else setDone({ needsApproval: !!json.data?.needsApproval, family });
    } catch {
      setError('Could not reach the server. Check your internet and try again.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Your {info.label.toLowerCase()} account is ready</h1>
        {done.family ? (
          <p>Your child&apos;s account is made and already linked to yours. Sign in as a parent to see their test reports as soon as they finish one. Your child signs in on the home page with their own username and password.</p>
        ) : done.needsApproval ? (
          <p>The Sahayak team checks every {info.label.toLowerCase()} account before it can follow any student. You can sign in now; you will see a note until it is approved.</p>
        ) : (
          <p>Next: sign in, then enter the one-time code your child gives you (they make it on their <strong>Sharing</strong> page).</p>
        )}
        <a className="btn btn--accent" href={`/${role}/login`}>Go to {info.label.toLowerCase()} sign in</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{info.label} sign up</h1>
      <p style={{ color: 'var(--slate)' }}>{info.blurb} {role === 'parent' ? 'You only see a child after the child gives you a code.' : 'You only see a student after the student\'s family gives you a code.'}</p>
      <div className="field"><label className="field__label" htmlFor="pn">{nameLabel}</label><input id="pn" className="field__input" value={f.displayName} onChange={set('displayName')} required /></div>
      {role === 'centre' && <div className="field"><label className="field__label" htmlFor="pc">Contact person (optional)</label><input id="pc" className="field__input" value={f.contactName} onChange={set('contactName')} /></div>}
      {role !== 'parent' && <div className="field"><label className="field__label" htmlFor="pcity">City (optional)</label><input id="pcity" className="field__input" value={f.city} onChange={set('city')} /></div>}
      {role === 'tutor' && <div className="field"><label className="field__label" htmlFor="pq">Qualification (optional)</label><input id="pq" className="field__input" value={f.qualification} onChange={set('qualification')} /></div>}
      {role !== 'parent' && <div className="field"><label className="field__label" htmlFor="ps">Subjects (optional)</label><input id="ps" className="field__input" value={f.subjects} onChange={set('subjects')} placeholder="e.g. Maths, Science" /></div>}
      <div className="field"><label className="field__label" htmlFor="pu">Choose a username</label><input id="pu" className="field__input" value={f.username} onChange={set('username')} required autoComplete="username" autoCapitalize="none" /></div>
      <div className="field">
        <label className="field__label" htmlFor="pe">Email {info.emailRequired ? '(needed)' : '(optional, lets you reset a forgotten password)'}</label>
        <input id="pe" type="email" className="field__input" value={f.email} onChange={set('email')} required={info.emailRequired} autoComplete="email" />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="pp">Password (at least 8 characters)</label>
        <input id="pp" type={show ? 'text' : 'password'} className="field__input" value={f.password} onChange={set('password')} required autoComplete="new-password" />
        <div style={{ fontSize: '0.88rem', marginTop: '0.3rem' }}>
          <a href="#" onClick={(ev) => { ev.preventDefault(); setF({ ...f, password: generateReadablePassword() }); setShow(true); }}>Suggest a password</a>
          {' · '}
          <a href="#" onClick={(ev) => { ev.preventDefault(); setShow(!show); }}>{show ? 'Hide' : 'Show'} password</a>
          {show && f.password && <span style={{ color: 'var(--slate)' }}> (write it down somewhere safe)</span>}
        </div>
      </div>
      {role === 'parent' && (
        <>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '0.6rem 0' }}>
            <input type="checkbox" checked={addChild} onChange={(e) => setAddChild(e.target.checked)} style={{ marginTop: '0.25rem' }} />
            <span style={{ fontSize: '0.92rem' }}><strong>Also create my child&apos;s account now.</strong> It is linked to yours straight away, so there is no code to exchange.</span>
          </label>
          {addChild && (
            <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '0.7rem', marginBottom: '0.6rem' }}>
              <legend style={{ padding: '0 0.4rem' }}>Child&apos;s account (Class 10 student)</legend>
              <div className="field"><label className="field__label" htmlFor="cn">Child&apos;s name</label><input id="cn" className="field__input" value={child.displayName} onChange={(e) => setChild({ ...child, displayName: e.target.value })} required /></div>
              <div className="field"><label className="field__label" htmlFor="cu">Child&apos;s username</label><input id="cu" className="field__input" value={child.username} onChange={(e) => setChild({ ...child, username: e.target.value })} autoCapitalize="none" required /></div>
              <div className="field"><label className="field__label" htmlFor="cp">Child&apos;s password (at least 8 characters)</label><input id="cp" type={show ? 'text' : 'password'} className="field__input" value={child.password} onChange={(e) => setChild({ ...child, password: e.target.value })} autoComplete="new-password" required /></div>
              <div className="field"><label className="field__label" htmlFor="ce">Child&apos;s email (optional)</label><input id="ce" type="email" className="field__input" value={child.email} onChange={(e) => setChild({ ...child, email: e.target.value })} /></div>
            </fieldset>
          )}
        </>
      )}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '0.6rem 0' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '0.25rem' }} />
        <span style={{ fontSize: '0.9rem' }}>I agree to the <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy policy</a>, and I will use what I see only to support the student.</span>
      </label>
      {error && <p className="alert">{error}</p>}
      <button className="btn btn--accent" disabled={busy || !consent}>{busy ? 'Creating…' : 'Create account'}</button>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Already registered? <a href={`/${role}/login`}>Sign in</a></p>
    </form>
  );
}
