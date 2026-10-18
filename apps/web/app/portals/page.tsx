import { PORTAL_INFO } from '@adaptive-tutor/core';

const CARDS = [
  { key: 'parent', title: 'Parents', text: PORTAL_INFO.parent.blurb, register: '/parent/register', login: '/parent/login' },
  { key: 'teacher', title: 'Teachers', text: 'Check the questions and answers Sahayak writes for students. Accounts are approved by the Sahayak team.', register: '/teacher/register', login: '/teacher/login' },
  { key: 'tutor', title: 'Tutors', text: PORTAL_INFO.tutor.blurb, register: '/tutor/register', login: '/tutor/login' },
  { key: 'centre', title: 'Coaching centres', text: PORTAL_INFO.centre.blurb, register: '/centre/register', login: '/centre/login' },
];

// A front door for everyone who is not a student. Each kind of account has its own sign up and sign in page.
export default function PortalsPage() {
  return (
    <main className="page">
      <div className="shell" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Parents, teachers, tutors and coaching centres</h1>
        <p style={{ color: 'var(--slate)' }}>Pick the one that describes you. Students sign in on the <a href="/">home page</a>. Parents, tutors and centres see a student only when the student&apos;s family gives them a one-time code.</p>
        <div className="stat-tile-row" style={{ alignItems: 'stretch' }}>
          {CARDS.map((c) => (
            <div key={c.key} className="chapter-row" style={{ display: 'block', flex: '1 1 14rem' }}>
              <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>{c.title}</h2>
              <p style={{ color: 'var(--slate)' }}>{c.text}</p>
              <div className="hero__actions">
                <a className="btn btn--accent btn--small" href={c.login}>Sign in</a>
                <a className="btn btn--ghost btn--small" href={c.register}>Sign up</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
