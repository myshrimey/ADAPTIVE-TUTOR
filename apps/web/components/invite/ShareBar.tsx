'use client';
import { useState } from 'react';
import { shareLinks } from '@adaptive-tutor/core/invitations/share';
import type { InviteRole } from '@adaptive-tutor/core/invitations/constants';

// Share buttons. WhatsApp / Telegram / email open the person's OWN app with a ready message; Sahayak never touches their account.
// Facebook and LinkedIn cannot take a pre-written message from a link, so those buttons copy the message instead.
export function ShareBar({ role, link, campaign }: { role: InviteRole; link: string; campaign?: string | null }) {
  const [note, setNote] = useState('');
  const s = shareLinks(role, link, campaign);
  const say = (t: string) => { setNote(t); setTimeout(() => setNote(''), 2500); };
  async function copy(text: string, ok: string) { try { await navigator.clipboard.writeText(text); say(ok); } catch { say('Could not copy. Please select the link and copy it by hand.'); } }
  async function native() { try { if (navigator.share) await navigator.share({ title: 'Your Sahayak invitation', text: s.text.split('\n\n')[0], url: link }); else await copy(s.text, 'Message copied.'); } catch { /* cancelled */ } }
  return (
    <div>
      <div className="field"><label className="field__label" htmlFor="invlink">Invitation link</label><input id="invlink" className="field__input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
        <button type="button" className="btn btn--accent" onClick={() => copy(link, 'Link copied.')}>Copy link</button>
        <a className="btn" href={s.whatsapp} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        <button type="button" className="btn" onClick={native}>Share…</button>
        <a className="btn" href={s.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
        <a className="btn" href={s.email}>Email</a>
        <button type="button" className="btn" onClick={() => copy(s.text, 'Message copied. Paste it into Facebook or LinkedIn.')}>Copy message (Facebook / LinkedIn)</button>
      </div>
      <p role="status" style={{ minHeight: '1.4em', color: 'var(--slate)', fontSize: '0.9rem', margin: 0 }}>{note}</p>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>The message contains the link only: no password and no login details. Whoever opens it chooses their own password.</p>
    </div>
  );
}
