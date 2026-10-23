'use client';
// "Invite a friend" panel for every role. Shows the person's own link, share buttons and counts. Counts only; never names.
import { useEffect, useState } from 'react';

type Ov = { code: string; role: string; invited: number; qualified: number; rewarded: number; held: number; daysEarned: number; heldDays: number; rewardsOn: boolean; daysReferrer: number; daysReferred: number; linksOn: boolean };

const WHO: Record<string, string> = { student: 'friends and classmates', parent: 'other parents', teacher: 'other teachers and their students', tutor: 'your students and other tutors', centre: 'other centres and the families you teach' };

export function ReferralPanel({ compact = false }: { compact?: boolean }) {
  const [o, setO] = useState<Ov | null>(null);
  const [state, setState] = useState<'loading' | 'out' | 'ok'>('loading');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/api/referral').then(async (r) => { if (!live) return; if (r.status === 401) { setState('out'); return; } const j = await r.json(); if (j.data) { setO(j.data); setState('ok'); } else setState('out'); }).catch(() => live && setState('out'));
    return () => { live = false; };
  }, []);
  if (state === 'loading') return null;
  const box: React.CSSProperties = { border: '1px solid var(--line, #cbd5e1)', borderRadius: 12, padding: compact ? '0.8rem' : '1rem', margin: '1rem 0', background: 'var(--card, #fff)' };
  if (state === 'out' || !o || !o.linksOn) {
    if (state === 'ok' && o && !o.linksOn) return null;
    return (<div style={box}><strong>Invite a friend</strong><p style={{ margin: '0.3rem 0 0', color: 'var(--slate)' }}>Sign in to get your own invite link. When a friend joins through it and finishes their first diagnostic, you both can earn extra days of access. <em>Terms &amp; Conditions Apply.</em></p></div>);
  }
  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${o.code}`;
  const msg = `Join me on Sahayak, an adaptive tutor for CBSE Class 10: ${link}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copy your link', link); } };
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: 'Sahayak', text: 'Join me on Sahayak, an adaptive tutor for CBSE Class 10', url: link }); return; } catch { /* cancelled */ } } copy(); };
  const reward = o.rewardsOn
    ? (o.role === 'student' || o.role === 'parent'
      ? `When someone you invite finishes their first diagnostic, you get ${o.daysReferrer} extra days of access and they get ${o.daysReferred}.`
      : `Your invites are counted, and the Sahayak team will contact you about a reward. The family you invite gets ${o.daysReferred} extra days.`)
    : 'Your invites are counted. The extra-days reward is not switched on yet; the team will announce it here.';
  return (
    <div style={box}>
      <strong>Invite {WHO[o.role] ?? 'friends'}</strong>
      {!compact && <p style={{ margin: '0.3rem 0', color: 'var(--slate)' }}>{reward} <em>Terms &amp; Conditions Apply.</em></p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', margin: '0.4rem 0' }}>
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Your invite link" className="field__input" style={{ flex: '1 1 14rem', minWidth: 0 }} />
        <button type="button" className="btn btn--accent btn--small" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
        <a className="btn btn--ghost btn--small" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <button type="button" className="btn btn--ghost btn--small" onClick={share}>Share…</button>
      </div>
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--slate)' }}>
        Invited: {o.invited} · Finished first diagnostic: {o.qualified}{o.daysEarned > 0 ? ` · Bonus days earned: ${o.daysEarned}` : ''}
        {o.heldDays > 0 ? ` (${o.heldDays} are kept for you and added when a paid plan starts)` : ''}
      </p>
    </div>
  );
}

/** Small note shown on sign-up forms when the visitor arrived through an invite link (?invited=1). */
export function InvitedNote() {
  const [on, setOn] = useState(false);
  useEffect(() => { try { setOn(new URLSearchParams(window.location.search).get('invited') === '1'); } catch { /* ignore */ } }, []);
  if (!on) return null;
  return <p className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>You were invited by a friend. Sign up and finish your first diagnostic: you both can earn extra days of access. Terms &amp; Conditions Apply.</p>;
}
