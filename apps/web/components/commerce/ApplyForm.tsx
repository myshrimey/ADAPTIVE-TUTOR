'use client';
import { useState } from 'react';

const LABEL: Record<string, string> = { tutor: 'Founding Tutor', centre: 'Founding Coaching Centre', partner: 'Founding Partner', subject_request: 'Request a subject' };

// Application / interest form. It sends a message to the founder; it is not a purchase and not an investment.
export function ApplyForm({ kind }: { kind: 'tutor' | 'centre' | 'partner' | 'subject_request' }) {
  const [f, setF] = useState({ name: '', organisation: '', contact: '', students: '', detail: '', interestLevel: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/commerce/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, kind, students: f.students ? Number(f.students) : null }) });
      const j = await r.json();
      if (j.error) setErr(j.error === 'too_many_attempts' ? 'Too many requests just now. Please try again later.' : j.error === 'name_and_contact_needed' ? 'Please enter your name and a phone number or email.' : 'Something went wrong. Please try again.'); else setDone(true);
    } catch { setErr('Could not reach the server.'); }
    setBusy(false);
  }
  if (done) return <div className="alert"><p style={{ margin: 0 }}>Thank you. The Sahayak team will contact you personally. Nothing has been charged and nothing is activated yet.</p></div>;
  return (
    <form onSubmit={submit} style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 'var(--step-1)' }}>{LABEL[kind]}</h2>
      {kind !== 'subject_request' && <>
        <div className="field"><label className="field__label" htmlFor="an">Your name</label><input id="an" className="field__input" value={f.name} onChange={set('name')} required /></div>
        <div className="field"><label className="field__label" htmlFor="ao">{kind === 'centre' ? 'Name of the coaching centre' : 'Organisation (optional)'}</label><input id="ao" className="field__input" value={f.organisation} onChange={set('organisation')} /></div>
        <div className="field"><label className="field__label" htmlFor="ac">Phone or email</label><input id="ac" className="field__input" value={f.contact} onChange={set('contact')} required /></div>
        {kind !== 'partner' && <div className="field"><label className="field__label" htmlFor="as">About how many students? (optional)</label><input id="as" type="number" min={0} className="field__input" value={f.students} onChange={set('students')} /></div>}
      </>}
      <div className="field"><label className="field__label" htmlFor="ad">{kind === 'subject_request' ? 'Which subject (and board/class) do you need?' : 'Anything you would like us to know (optional)'}</label><textarea id="ad" className="field__input" rows={3} value={f.detail} onChange={set('detail')} maxLength={800} required={kind === 'subject_request'} /></div>
      {kind === 'partner' && <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>This only tells us you would like to learn more about supporting Sahayak. It is not an investment and creates no commitment on either side.</p>}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
      {err && <p className="alert">{err}</p>}
      <button className="btn btn--accent" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
    </form>
  );
}
