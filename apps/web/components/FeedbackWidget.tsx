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
  const [kind, setKind] = useState('');
  const [impact, setImpact] = useState('');
  const [ctx, setCtx] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
  }, []);

  // v73: any screen can open the form with a preset, e.g. window.dispatchEvent(new CustomEvent('sahayak:feedback', { detail: { kind: 'question', context: { questionId: '...' } } })).
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail ?? {}; if (typeof d.kind === 'string') setKind(d.kind); if (d.context && typeof d.context === 'object') setCtx(d.context); setOpen(true); };
    window.addEventListener('sahayak:feedback', h);
    return () => window.removeEventListener('sahayak:feedback', h);
  }, []);

  function reset() {
    setRating(null);
    setKind('');
    setImpact('');
    setCtx({});
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
          kind: kind || undefined,
          impact: impact || undefined,
          context: ctx,
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

              <select className="field__input" style={{ width: '100%', marginBottom: '0.5rem' }} aria-label="What is it about?" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">What is it about? (optional)</option>
                <option value="bug">Something is broken</option><option value="wrong_answer">A wrong answer or marking</option><option value="question">A problem with a question</option><option value="explanation">A confusing explanation</option><option value="language">Language or translation</option><option value="idea">An idea or request</option><option value="price">Price or payment</option><option value="praise">Something I like</option><option value="other">Something else</option>
              </select>
              <textarea
                className="field__input"
                style={{ width: '100%', minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="What worked, what didn't, what confused you..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
              />

              <select className="field__input" style={{ width: '100%', marginTop: '0.6rem' }} aria-label="How did it affect you?" value={impact} onChange={(e) => setImpact(e.target.value)}>
                <option value="">How did it affect you? (optional)</option>
                <option value="minor">Minor inconvenience</option><option value="harder">Made the task harder</option><option value="blocked">Could not complete the task</option><option value="incorrect">Gave me incorrect information</option><option value="prep">Could affect my preparation</option><option value="serious">Serious problem</option>
              </select>

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
