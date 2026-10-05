'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const SUBJECTS = [
  { slug: 'maths', name: 'Mathematics', note: '14 chapters — Real Numbers through Probability' },
  { slug: 'science', name: 'Science', note: '10 chapters across Physics, Chemistry, and Biology' },
  { slug: 'social-science', name: 'Social Science', note: '24 chapters across History, Geography, Civics, and Economics' },
];

type Mode = 'signup' | 'signin' | 'forgot';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [subject, setSubject] = useState('maths');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // e.g. "check your email"

  // True once there's a real session AND we know the account still needs the
  // name/subject step (a brand-new signup, or an account that signed up but
  // never finished onboarding in an earlier visit).
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // True until we've checked whether the browser already holds a valid
  // session (a returning user, or someone who confirmed their email in a
  // different tab and came back here). Without this, a signed-in user would
  // see the Sign Up tab instead of being routed straight to onboarding or
  // the dashboard. Starts true so we never flash the auth form first.
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        afterAuthEstablished().finally(() => setCheckingSession(false));
      } else {
        setCheckingSession(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  async function afterAuthEstablished() {
    // Signed in (or signed up with email confirmation off, which returns a
    // session immediately) — find out whether this account still needs the
    // name/subject step, or already has a student record from before.
    const res = await fetch('/api/student/profile');
    const json = await res.json();
    if (!json.error && json.data?.onboardingCompleted) {
      router.push('/dashboard');
      return;
    }
    // Any error here (most commonly "student_not_found") or
    // onboardingCompleted === false both mean: show the name/subject step.
    setNeedsOnboarding(true);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      // Email confirmation is off for this project — straight in.
      await afterAuthEstablished();
    } else {
      // Email confirmation is required. There's no session yet, so we can't
      // create the student record now — the name/subject step runs after
      // they confirm and sign in.
      setNotice("Check your email for a confirmation link, then come back and sign in.");
      setMode('signin');
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    await afterAuthEstablished();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }
    setNotice('Check your email for a password reset link.');
  }

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);

    const res = await fetch('/api/student/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, grade: 'CBSE-10', subject, board: 'CBSE', class: '10' }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (json.error) {
      setError(json.error);
      return;
    }
    router.push('/diagnostic');
  }

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <p className="hero__eyebrow">CBSE Class 10 · Maths &amp; Science</p>
          <h1>
            Same syllabus.
            <br />A different path for every student.
          </h1>
          <p className="hero__lede">
            Sahayak runs a short diagnostic, finds exactly where a student's understanding
            starts to wobble, and teaches from there — asking questions, giving hints
            before answers, and adjusting difficulty every single turn.
          </p>
        </section>

        <section className="shell--narrow" style={{ paddingLeft: 0, paddingBottom: 'var(--space-4)' }}>
          {error && <p className="alert">{error}</p>}
          {notice && (
            <p className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>
              {notice}
            </p>
          )}

          {checkingSession ? (
            <p style={{ color: 'var(--slate)' }}>Checking your session…</p>
          ) : needsOnboarding ? (
            <form onSubmit={handleOnboardingSubmit}>
              <p style={{ color: 'var(--slate)' }}>One last step — what should we call you, and which subject?</p>
              <div className="field">
                <label className="field__label" htmlFor="displayName">
                  What should we call you?
                </label>
                <input
                  id="displayName"
                  className="field__input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <span className="field__label">Which subject?</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.2rem' }}>
                  {SUBJECTS.map((s) => (
                    <label key={s.slug} className="subject-card" data-selected={subject === s.slug}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{s.note}</div>
                      </div>
                      <input
                        type="radio"
                        name="subject"
                        value={s.slug}
                        checked={subject === s.slug}
                        onChange={() => setSubject(s.slug)}
                        style={{ accentColor: 'var(--marigold-deep)' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="hero__actions">
                <button type="submit" className="btn btn--accent" disabled={submitting}>
                  {submitting ? 'Starting…' : 'Start the diagnostic'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1.2rem', marginBottom: 'var(--space-2)', borderBottom: '1px solid var(--line)' }}>
                {(['signup', 'signin'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      resetMessages();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.5rem 0',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.95rem',
                      fontWeight: mode === m ? 600 : 400,
                      color: mode === m ? 'var(--ink)' : 'var(--slate)',
                      borderBottom: mode === m ? '2px solid var(--marigold-deep)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'signup' ? 'Sign up' : 'Sign in'}
                  </button>
                ))}
              </div>

              {mode === 'forgot' ? (
                <form onSubmit={handleForgotPassword}>
                  <div className="field">
                    <label className="field__label" htmlFor="email">
                      Email
                    </label>
                    <input id="email" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div className="hero__actions">
                    <button type="submit" className="btn btn--accent" disabled={submitting}>
                      {submitting ? 'Sending…' : 'Send reset link'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => { setMode('signin'); resetMessages(); }}>
                      Back to sign in
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn}>
                  <div className="field">
                    <label className="field__label" htmlFor="email">
                      Email
                    </label>
                    <input id="email" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="field__input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>

                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); resetMessages(); }}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--slate)', fontSize: '0.85rem', cursor: 'pointer', marginBottom: 'var(--space-2)' }}
                    >
                      Forgot password?
                    </button>
                  )}

                  <div className="hero__actions">
                    <button type="submit" className="btn btn--accent" disabled={submitting}>
                      {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                    </button>
                    {mode === 'signup' && <span className="hero__note">Takes about 10 minutes for the whole diagnostic.</span>}
                  </div>
                </form>
              )}
            </>
          )}
        </section>

        <section className="steps">
          <div className="step">
            <div className="step__number">01</div>
            <div className="step__title">A short diagnostic</div>
            <div className="step__body">
              8–15 questions that adapt as you answer — a miss on a topic prompts a quick
              check on what it depends on, so we find the real gap, not just the wrong answer.
            </div>
          </div>
          <div className="step">
            <div className="step__number">02</div>
            <div className="step__title">A tutor that teaches, not answers</div>
            <div className="step__body">
              Explanations, worked examples, and guided practice at the right difficulty —
              hints before solutions, and never a confirmation of understanding that hasn't
              been shown yet.
            </div>
          </div>
          <div className="step">
            <div className="step__number">03</div>
            <div className="step__title">Mastery you can actually see</div>
            <div className="step__body">
              Every skill tracked on its own, scored transparently, with a plain-language
              summary of what was learned after every session.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
