'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useLanguage } from '@/components/LanguageProvider';
import { accessErrorMessage } from '@/lib/access-errors';
import { FaqSection } from '@/components/FaqSection';
import { PlanCards } from '@/components/PlanCards';
import { validateUsername, validatePassword, validateOptionalEmail, generateReadablePassword, IDENTITY_ERROR_TEXT } from '@adaptive-tutor/core';

// Shown at sign-up. `status` mirrors subjects.status in the database (the
// database is the real gate — registerSubject rejects anything not usable);
// keep the two in sync when a subject's readiness changes.
const SUBJECTS: { slug: string; name: string; note: string; status: 'ready' | 'pilot' }[] = [
  { slug: 'maths', name: 'Mathematics (Standard)', note: '14 chapters — Real Numbers through Probability. Full-difficulty questions.', status: 'ready' },
  { slug: 'maths-basic', name: 'Mathematics (Basic)', note: 'Same chapters as Standard, with easier, more direct questions. Choose one Maths level.', status: 'pilot' },
  { slug: 'science', name: 'Science', note: '10 chapters across Physics, Chemistry, and Biology', status: 'ready' },
  { slug: 'social-science', name: 'Social Science', note: '24 chapters across History, Geography, Civics, and Economics', status: 'pilot' },
  { slug: 'english', name: 'English Language & Literature', note: 'First Flight, Footprints Without Feet, grammar and writing', status: 'pilot' },
  { slug: 'hindi', name: 'Hindi Course A', note: 'Kshitij, Kritika, grammar and writing (Devanagari questions, being reviewed by a teacher). Choose Course A or B, not both.', status: 'pilot' },
  { slug: 'hindi-b', name: 'Hindi Course B', note: 'Sparsh, Sanchayan, grammar and writing (Devanagari questions, being reviewed by a teacher). Choose Course A or B, not both.', status: 'pilot' },
  { slug: 'computer-applications', name: 'Computer Applications', note: 'Networking, HTML, cyber safety, logic and productivity tools', status: 'pilot' },
];

type Mode = 'signup' | 'signin' | 'forgot';

export function HomeClient({ signedIn = false }: { signedIn?: boolean }) {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const [mode, setMode] = useState<Mode>('signin');
  // Self sign-up is closed during early access (accounts are created by the founder).
  const [signupsOpen, setSignupsOpen] = useState(true);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [website, setWebsite] = useState(''); // hidden trap field; real people leave it empty
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [chosenSubjects, setChosenSubjects] = useState<string[]>(['maths']);
  const [examYear, setExamYear] = useState<number>(2027);
  const [prefLanguage, setPrefLanguage] = useState<'en' | 'hi'>('en');
  const [dailyMinutes, setDailyMinutes] = useState<number>(45);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // e.g. "check your email"

  // True once there's a real session AND we know the account still needs the
  // name/subject step (a brand-new signup, or an account that signed up but
  // never finished onboarding in an earlier visit).
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  // Someone who is already signed in never sees the sign-in/sign-up page or the sales sections:
  // only the one step they are in the middle of (choosing subjects) or a short message.
  const hideMarketing = (signedIn && !error) || needsOnboarding;

  // True until we've checked whether the browser already holds a valid
  // session (a returning user, or someone who confirmed their email in a
  // different tab and came back here). Without this, a signed-in user would
  // see the Sign Up tab instead of being routed straight to onboarding or
  // the dashboard. Starts true so we never flash the auth form first.
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch('/api/public/config').then((r) => r.json()).then((j) => { setSignupsOpen(j.data?.signupsOpen !== false); }).catch(() => {});
  }, []);

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
    const res = await fetch('/api/me');
    const json = await res.json();
    const me = json.data;
    // A full browser navigation (not router.push) so the freshly written sign-in cookie
    // is always sent — see the note in git history about the post-sign-in race.
    if (me?.role === 'admin') {
      window.location.href = '/admin';
      return;
    }
    if (me?.role === 'teacher') {
      window.location.href = '/teacher';
      return;
    }
    if (me?.role === 'student') {
      // First sign-in for an account the founder created: complete the profile first.
      if (me.mustCompleteProfile) {
        window.location.href = '/profile?welcome=1';
        return;
      }
      if (me.onboardingCompleted) {
        window.location.href = '/dashboard';
        return;
      }
      setNeedsOnboarding(true);
      return;
    }
    // Signed in but not an invited student, teacher or admin.
    if (signupsOpen) {
      setNeedsOnboarding(true);
      return;
    }
    await createClient().auth.signOut();
    setError(t('auth.invitationOnly'));
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    const bad = validateUsername(username) ?? validatePassword(password, username) ?? validateOptionalEmail(email);
    if (bad) { setError(IDENTITY_ERROR_TEXT[bad]); return; }
    if (!consent) { setError('Please tick the box to confirm a parent or guardian agrees.'); return; }
    setSubmitting(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email: email.trim(), displayName, consent, website }),
    });
    const json = await res.json().catch(() => ({ error: 'register_failed' }));
    if (json.error) {
      setSubmitting(false);
      const known: Record<string, string> = {
        username_taken: 'That username is already taken. Please choose another.',
        email_already_registered: 'That email is already used for another account. Sign in instead, or leave the email empty.',
        too_many_attempts: 'Too many sign-ups from this network just now. Please try again in an hour.',
        daily_cap_reached: 'We are at our daily limit for new sign-ups. Please try again tomorrow.',
        signups_closed: 'Sign-up is closed right now.',
        missing_name: "Please enter the student's name.",
        consent_required: 'Please tick the box to confirm a parent or guardian agrees.',
      };
      setError(known[json.error] ?? (IDENTITY_ERROR_TEXT as any)[json.error] ?? 'Could not create the account. Please try again.');
      return;
    }
    // Account exists on the server; sign in with the same details and go on to choosing subjects.
    const login = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: username, password }) });
    setSubmitting(false);
    if (!login.ok) { setNotice('Account created. Please sign in with your username and password.'); setMode('signin'); return; }
    await afterAuthEstablished();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email.trim(), password }) });
    setSubmitting(false);
    if (!res.ok) { setError('Username, email or password is not right. Please check and try again.'); return; }
    await afterAuthEstablished();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    if (!email.includes('@')) {
      setNotice('Accounts made without an email cannot reset the password here. Please contact us (the number is at the bottom of the page) and we will set a new one.');
      return;
    }
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
      body: JSON.stringify({ displayName, grade: 'CBSE-10', subjects: chosenSubjects, board: 'CBSE', class: '10', examYear, preferredLanguage: prefLanguage, dailyStudyMinutes: dailyMinutes }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (json.error) {
      setError(accessErrorMessage(json.error) ?? json.error);
      return;
    }
    if (prefLanguage !== lang) setLang(prefLanguage);
    router.push('/diagnostic');
  }

  return (
    <main className="page">
      <div className="shell">
        {!hideMarketing && (
        <section className="hero hero-banner">
          <p className="hero__eyebrow">CBSE Class 10 · Board Preparation 2027</p>
          <h1>How ready is your child for CBSE Class X 2027?</h1>
          <p className="hero__lede">
            Know where your child stands. Understand what is holding them back. Know what to do next.
          </p>
          <p className="hero__lede" style={{ fontSize: '1rem' }}>
            Sahayak assesses each subject, finds exactly where understanding starts to break down, teaches from there,
            practises, reassesses, and shows parents the evidence: what has improved, what needs attention, and whether
            it is working. Marks alone do not tell the whole story.
          </p>
          <p className="hero__note">Assess → Learn → Practise → Reassess → Improve</p>
        </section>
        )}

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
                <span className="field__label">{t('onboarding.boardClass')}</span>
                <div style={{ color: 'var(--slate)' }}>CBSE · Class 10</div>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="examYear">{t('onboarding.examYear')}</label>
                <select id="examYear" className="field__input" value={examYear} onChange={(e) => setExamYear(Number(e.target.value))}>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="prefLang">{t('onboarding.language')}</label>
                <select id="prefLang" className="field__input" value={prefLanguage} onChange={(e) => setPrefLanguage(e.target.value as 'en' | 'hi')}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="dailyMin">{t('onboarding.studyTime')}</label>
                <select id="dailyMin" className="field__input" value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))}>
                  {[20, 30, 45, 60, 90, 120].map((m) => (<option key={m} value={m}>{m} {t('onboarding.minutes')}</option>))}
                </select>
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
                          setChosenSubjects((prev) => {
                            if (!e.target.checked) return prev.filter((x) => x !== s.slug);
                            // Maths Standard/Basic and Hindi A/B are alternatives: picking one unticks the other.
                            const ALT: Record<string, string> = { maths: 'maths-basic', 'maths-basic': 'maths', hindi: 'hindi-b', 'hindi-b': 'hindi' };
                            const other = ALT[s.slug] ?? null;
                            return [...prev.filter((x) => x !== other), s.slug];
                          })
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
                {(signupsOpen ? (['signup', 'signin'] as const) : (['signin'] as const)).map((m) => (
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

              {!signupsOpen && mode !== 'forgot' && (
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', marginTop: 0 }}>{t('auth.invitationNote')}</p>
              )}
              {mode !== 'forgot' && (
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', marginTop: 0 }}>
                  <a href="/teacher/register">{t('auth.teacherRegister')}</a>
                </p>
              )}

              {mode === 'forgot' ? (
                <form onSubmit={handleForgotPassword}>
                  <div className="field">
                    <label className="field__label" htmlFor="email">
                      {t('auth.email')}
                    </label>
                    <input id="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
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
                  {mode === 'signup' ? (
                    <>
                      <div className="field">
                        <label className="field__label" htmlFor="displayName">Student&apos;s name</label>
                        <input id="displayName" className="field__input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required autoFocus />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="username">Choose a username</label>
                        <input id="username" className="field__input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} required />
                        <span className="hero__note">3 to 20 small letters or numbers (dot and underscore allowed). Do not use your full name or phone number.</span>
                      </div>
                    </>
                  ) : (
                    <div className="field">
                      <label className="field__label" htmlFor="email">Username or email</label>
                      <input id="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus />
                    </div>
                  )}
                  <div className="field">
                    <label className="field__label" htmlFor="password">
                      {t('auth.password')}
                    </label>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="field__input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={mode === 'signup' ? 8 : undefined}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                    />
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: 6, fontSize: '0.85rem' }}>
                      {mode === 'signup' && (
                        <button type="button" onClick={() => { setPassword(generateReadablePassword()); setShowPassword(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
                          Suggest a strong password
                        </button>
                      )}
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show password</label>
                    </div>
                    {mode === 'signup' && <span className="hero__note">At least 8 characters. If you use the suggested one, write it down before you continue.</span>}
                  </div>

                  {mode === 'signup' && (
                    <>
                      <div className="field">
                        <label className="field__label" htmlFor="optEmail">Email (optional)</label>
                        <input id="optEmail" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <span className="hero__note">Only needed if you want to reset a forgotten password yourself. Without an email, we can reset it for you if you contact us.</span>
                      </div>
                      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', height: 0, overflow: 'hidden' }}>
                        <label>Website <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                      </div>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
                        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} />
                        <span>I am the parent or guardian, or my parent or guardian has agreed that the student may use Sahayak. We have read the <a href="/legal/privacy">privacy policy</a> and <a href="/legal/terms">terms</a>.</span>
                      </label>
                    </>
                  )}

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

        {!hideMarketing && (
          <>
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

        <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>See it before you decide</h2>
          <p style={{ color: 'var(--slate)' }}>
            Look at a made-up example of the parent report, try eight free questions with no sign-in, or read how we keep this honest and trustworthy.
          </p>
          <p style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a className="btn btn--accent" href="/check">Free readiness check</a>
            <a className="btn btn--ghost" href="/sample-report">Sample report</a>
            <a className="btn btn--ghost" href="/trust">How we keep this trustworthy</a>
            <a className="btn btn--ghost" href="/about">About Sahayak</a>
          </p>
        </section>

        <section id="plans" style={{ marginTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{t('plans.home.title')}</h2>
          <PlanCards lang={lang} />
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>
            Sahayak Complete Board Preparation shows where your child stands in each registered subject,
            what is holding them back, and what to do next — from real evidence, not guesses. We do not
            promise marks or predict board scores.
          </p>
          <p>
            <a className="btn btn--ghost" href="/pilot">{t('pilot.title')}</a>
          </p>
        </section>

        <div style={{ paddingBottom: 'var(--space-4)' }}>
          <FaqSection lang={lang} />
        </div>
          </>
        )}
      </div>
    </main>
  );
}
