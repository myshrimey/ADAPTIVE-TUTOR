'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useLanguage } from '@/components/LanguageProvider';

// Shown at sign-up. `status` mirrors subjects.status in the database (the
// database is the real gate — registerSubject rejects anything not usable);
// keep the two in sync when a subject's readiness changes.
const SUBJECTS: { slug: string; name: string; note: string; status: 'ready' | 'pilot' }[] = [
  { slug: 'maths', name: 'Mathematics', note: '14 chapters — Real Numbers through Probability', status: 'ready' },
  { slug: 'science', name: 'Science', note: '10 chapters across Physics, Chemistry, and Biology', status: 'ready' },
  { slug: 'social-science', name: 'Social Science', note: '24 chapters across History, Geography, Civics, and Economics', status: 'pilot' },
  { slug: 'english', name: 'English Language & Literature', note: 'First Flight, Footprints Without Feet, grammar and writing', status: 'pilot' },
  { slug: 'hindi', name: 'Hindi Course A', note: 'Kshitij, Kritika, grammar and writing (questions in English letters for now)', status: 'pilot' },
  { slug: 'computer-applications', name: 'Computer Applications', note: 'Networking, HTML, cyber safety, logic and productivity tools', status: 'pilot' },
];

type Mode = 'signup' | 'signin' | 'forgot';

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [chosenSubjects, setChosenSubjects] = useState<string[]>(['maths']);

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
      // A full browser navigation here, not router.push(). router.push() asks
      // the server for /dashboard over a soft (client-side) request, and that
      // request can reach the server a moment before the sign-in cookie has
      // actually been written to the browser — so the dashboard's own
      // "redirect to / if not signed in" check fires and bounces straight
      // back to this page, which looks exactly like "nothing happened after
      // sign in". A real page load always carries whatever cookies exist at
      // that moment, so it doesn't hit that race.
      window.location.href = '/dashboard';
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
      setNotice(t('auth.checkEmailConfirm'));
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
    setNotice(t('auth.checkEmailReset'));
  }

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    if (chosenSubjects.length === 0) {
      setError('Please choose at least one subject.');
      return;
    }
    setSubmitting(true);

    const res = await fetch('/api/student/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, grade: 'CBSE-10', subjects: chosenSubjects, board: 'CBSE', class: '10' }),
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
        <section className="hero hero-banner">
          <p className="hero__eyebrow">CBSE Class 10 · Board Preparation 2027</p>
          <h1>
            Same syllabus.
            <br />A different path for every student.
          </h1>
          <p className="hero__lede">
            How ready is your child for the 2027 board exams? Sahayak runs a short diagnostic in each
            subject, finds exactly where understanding starts to wobble, teaches from there, and shows
            parents the evidence — what has improved, what needs attention, and what to do next.
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
            <p style={{ color: 'var(--slate)' }}>{t('auth.checkingSession')}</p>
          ) : needsOnboarding ? (
            <form onSubmit={handleOnboardingSubmit}>
              <p style={{ color: 'var(--slate)' }}>{t('onboarding.oneLastStep')}</p>
              <div className="field">
                <label className="field__label" htmlFor="displayName">
                  {t('onboarding.yourName')}
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
                <span className="field__label">{t('onboarding.whichSubject')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.2rem' }}>
                  {SUBJECTS.map((s) => (
                    <label key={s.slug} className="subject-card" data-selected={chosenSubjects.includes(s.slug)} data-subject={s.slug}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {s.name}{' '}
                          {s.status !== 'ready' && (
                            <span className="subject-chip__score" style={{ marginLeft: '0.4rem' }}>
                              {t(`subject.status.${s.status}` as any)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{s.note}</div>
                      </div>
                      <input
                        type="checkbox"
                        name="subjects"
                        value={s.slug}
                        checked={chosenSubjects.includes(s.slug)}
                        onChange={(e) =>
                          setChosenSubjects((prev) => (e.target.checked ? [...prev, s.slug] : prev.filter((x) => x !== s.slug)))
                        }
                        style={{ accentColor: 'var(--marigold-deep)' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="hero__actions">
                <button type="submit" className="btn btn--accent" disabled={submitting}>
                  {submitting ? t('onboarding.starting') : t('onboarding.startDiagnostic')}
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
                    {m === 'signup' ? t('auth.signUp') : t('auth.signIn')}
                  </button>
                ))}
              </div>

              {mode === 'forgot' ? (
                <form onSubmit={handleForgotPassword}>
                  <div className="field">
                    <label className="field__label" htmlFor="email">
                      {t('auth.email')}
                    </label>
                    <input id="email" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div className="hero__actions">
                    <button type="submit" className="btn btn--accent" disabled={submitting}>
                      {submitting ? 'Sending…' : t('auth.sendResetLink')}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => { setMode('signin'); resetMessages(); }}>
                      {t('auth.backToSignIn')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn}>
                  <div className="field">
                    <label className="field__label" htmlFor="email">
                      {t('auth.email')}
                    </label>
                    <input id="email" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="password">
                      {t('auth.password')}
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
                      {t('auth.forgotPassword')}
                    </button>
                  )}

                  <div className="hero__actions">
                    <button type="submit" className="btn btn--accent" disabled={submitting}>
                      {submitting ? t('auth.pleaseWait') : mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}
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

        <section style={{ marginTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>For parents</h2>
          <p style={{ color: 'var(--slate)' }}>
            Sahayak Complete Board Preparation shows where your child stands in each registered subject,
            what is holding them back, and what to do next — from real evidence, not guesses. We do not
            promise marks or predict board scores.
          </p>
          <p>
            <a className="btn btn--ghost" href="/pilot">See what&apos;s included and the price (₹999)</a>
          </p>
        </section>
      </div>
    </main>
  );
}
