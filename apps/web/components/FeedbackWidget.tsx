'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

// A floating feedback entry point present on every page (mounted once in
// layout.tsx). Works for a signed-in student or a visitor who hasn't signed
// up yet — real students/parents trialing the app need a way to tell us
// what's broken or confusing without leaving the page they're on.
export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
  }, []);

  function reset() {
    setRating(null);
    setMessage('');
    setContactEmail('');
    setError(null);
    setSent(false);
  }

  function close() {
    setOpen(false);
    // Delay the reset so the "thanks" state is visible for a moment first
    // rather than vanishing the instant the panel closes.
    setTimeout(reset, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError('Say a little about what happened.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          rating,
          page: pathname,
          contactEmail: contactEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSent(true);
    } catch {
      setError("Couldn't send that — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feedback-widget">
      {open && (
        <div className="feedback-widget__panel">
          {sent ? (
            <div className="feedback-widget__thanks">
              <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Thank you!</p>
              <p style={{ color: 'var(--slate)', margin: 0 }}>We read every note — this genuinely helps.</p>
              <button type="button" className="btn btn--ghost btn--small" style={{ marginTop: '0.9rem' }} onClick={close}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>How's it going?</p>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem' }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} out of 5`}
                    className="feedback-widget__rating"
                    data-selected={rating === n}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <textarea
                className="field__input"
                style={{ width: '100%', minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="What worked, what didn't, what confused you..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
              />

              {!signedIn && (
                <input
                  type="email"
                  className="field__input"
                  style={{ width: '100%', marginTop: '0.6rem' }}
                  placeholder="Email (optional, if you'd like a reply)"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              )}

              {error && <p className="alert" style={{ marginTop: '0.6rem' }}>{error}</p>}

              <button type="submit" className="btn btn--accent" style={{ width: '100%', marginTop: '0.8rem' }} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      <button type="button" className="feedback-widget__tab" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Feedback'}
      </button>
    </div>
  );
}
