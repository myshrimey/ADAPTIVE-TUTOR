'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { FB_ATTACH_MAX_FILES, FB_ATTACH_MAX_BYTES, FB_ATTACH_MAX_EDGE, FB_ATTACH_NOTICE, FB_ATTACH_ERRORS, FB_ATTACH_TYPES, fitWithin } from '@adaptive-tutor/core';

type Pic = { blob: Blob; url: string };

// v106: shrink a picture in the browser (longest side limit, JPEG). Returns null if the file is not a usable picture.
async function shrinkPicture(file: File): Promise<Blob | null> {
  try {
    if (!(FB_ATTACH_TYPES as readonly string[]).includes(file.type)) return null;
    const bmp = await createImageBitmap(file);
    const { width, height } = fitWithin(bmp.width, bmp.height, FB_ATTACH_MAX_EDGE);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const g = canvas.getContext('2d'); if (!g) return null;
    g.fillStyle = '#fff'; g.fillRect(0, 0, width, height); g.drawImage(bmp, 0, 0, width, height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return blob && blob.size <= FB_ATTACH_MAX_BYTES ? blob : null;
  } catch { return null; }
}

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
  const [pics, setPics] = useState<Pic[]>([]);
  const [picNote, setPicNote] = useState('');
  const [lostPics, setLostPics] = useState(0);

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
    pics.forEach((p) => URL.revokeObjectURL(p.url));
    setPics([]); setPicNote(''); setLostPics(0);
  }

  async function addFiles(list: FileList | File[] | null) {
    setPicNote('');
    const files = Array.from(list ?? []);
    const room = FB_ATTACH_MAX_FILES - pics.length;
    if (files.length > room) setPicNote(FB_ATTACH_ERRORS.too_many_pictures);
    const added: Pic[] = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      const blob = await shrinkPicture(f);
      if (blob) added.push({ blob, url: URL.createObjectURL(blob) }); else setPicNote(FB_ATTACH_ERRORS.not_a_picture);
    }
    if (added.length) setPics((p) => [...p, ...added].slice(0, FB_ATTACH_MAX_FILES));
  }
  function removePic(i: number) { setPics((p) => { URL.revokeObjectURL(p[i]?.url); return p.filter((_, j) => j !== i); }); }
  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); void addFiles(files); }
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
      // v106: the message is already saved. Now add the pictures, one by one; a failed picture never loses the message.
      let lost = 0;
      if (pics.length && json.data?.id && json.data?.attachToken) {
        for (const p of pics) {
          try {
            const fd = new FormData(); fd.append('feedbackId', json.data.id); fd.append('token', json.data.attachToken); fd.append('file', p.blob, 'screenshot.jpg');
            const r = await fetch('/api/feedback/attachment', { method: 'POST', body: fd }); const j = await r.json();
            if (j.error) lost++;
          } catch { lost++; }
        }
      } else if (pics.length) lost = pics.length;
      setLostPics(lost);
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
              {lostPics > 0 && <p className="feedback-widget__picnote">Your message was sent, but {lostPics} picture(s) could not be added. You can send them in a new note.</p>}
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
                onPaste={onPaste}
                autoFocus
              />

              <div className="feedback-widget__pics">
                <label className="btn btn--ghost btn--small feedback-widget__attach" data-disabled={pics.length >= FB_ATTACH_MAX_FILES}>
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="feedback-widget__file" aria-label="Add a screenshot or picture" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} disabled={pics.length >= FB_ATTACH_MAX_FILES} />
                  Add a screenshot
                </label>
                <span className="feedback-widget__picnote">{pics.length}/{FB_ATTACH_MAX_FILES} · you can also paste one here</span>
                {pics.length > 0 && (
                  <ul className="feedback-widget__thumbs">
                    {pics.map((p, i) => (
                      <li key={p.url}>
                        <img src={p.url} alt={`Picture ${i + 1}`} />
                        <button type="button" className="btn btn--ghost btn--small" onClick={() => removePic(i)} aria-label={`Remove picture ${i + 1}`}>×</button>
                      </li>
                    ))}
                  </ul>
                )}
                {picNote && <p className="feedback-widget__picerr" role="alert">{picNote}</p>}
                <p className="feedback-widget__privacy">{FB_ATTACH_NOTICE}</p>
              </div>

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
