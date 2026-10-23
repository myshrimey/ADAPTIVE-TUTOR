'use client';

import { InvitedNote } from '@/components/ReferralPanel';
import { useState } from 'react';

// Teachers can register themselves. The account waits for the founder's approval.
export default function TeacherRegisterPage() {
  const [form, setForm] = useState({ displayName: '', email: '', password: '', qualification: '', school: '', subjects: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const messages: Record<string, string> = {
    email_already_registered: 'That email already has an account. Try signing in from the home page.',
    invalid_email: 'That email does not look right.',
    missing_name: 'Please enter your name.',
    password_too_short: 'Password must be at least 8 characters.',
    registration_failed: 'Could not register right now. Please try again later.',
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/teacher/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    setBusy(false);
    if (json.error) return setError(messages[json.error] ?? json.error);
    setDone(true);
  }

  if (done) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Thank you for registering</h1>
          <p>Your teacher account has been created and is waiting for approval by the Sahayak team. Once it is approved, sign in from the <a href="/">home page</a> with your email and password to start reviewing questions.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Teacher registration</h1>
        <InvitedNote />
        <p style={{ color: 'var(--slate)' }}>
          Help check the questions, answers and explanations that Sahayak&apos;s AI writes for CBSE Class 10 students. Your feedback decides what students see. Registrations are approved by the Sahayak team before you can start.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="tn">Your name</label>
            <input id="tn" className="field__input" value={form.displayName} onChange={set('displayName')} required />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="te">Email</label>
            <input id="te" type="email" className="field__input" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tp">Password (at least 8 characters)</label>
            <input id="tp" type="password" className="field__input" value={form.password} onChange={set('password')} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tq">Qualification (optional)</label>
            <input id="tq" className="field__input" value={form.qualification} onChange={set('qualification')} placeholder="e.g. M.Sc. Maths, B.Ed." />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ts">School or institution (optional)</label>
            <input id="ts" className="field__input" value={form.school} onChange={set('school')} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tj">Subjects you teach (optional)</label>
            <input id="tj" className="field__input" value={form.subjects} onChange={set('subjects')} placeholder="e.g. Maths, Science" />
          </div>
          {/* Honeypot: real people never see or fill this. */}
          <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
          </div>
          {error && <p className="alert">{error}</p>}
          <button className="btn btn--accent" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
        </form>
      </div>
    </main>
  );
}
