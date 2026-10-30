'use client';
import { useState } from 'react';
import { INVITE_ROLES, INVITE_ROLE_LABEL, ROLE_FIELDS, NAME_LABEL, type InviteRole } from '@adaptive-tutor/core/invitations/constants';
import { ShareBar } from './ShareBar';

// One form for every role: pick the role, then only that role's fields appear. The server re-checks everything.
export function InviteCreator({ endpoint = '/api/admin/invitations', roles = [...INVITE_ROLES], initialRole, detailBase = '/admin/invitations', listHref = '/admin/invitations' }:
  { endpoint?: string; roles?: InviteRole[]; initialRole?: InviteRole; detailBase?: string; listHref?: string }) {
  const [role, setRole] = useState<InviteRole>(initialRole && roles.includes(initialRole) ? initialRole : roles[0]);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({}); const [note, setNote] = useState(''); const [days, setDays] = useState('14'); const [campaign, setCampaign] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState<any>(null);
  const reset = () => { setName(''); setEmail(''); setPhone(''); setFields({}); setNote(''); setErr(''); setDone(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, name, email, phone, fields, note, expiryDays: Number(days), campaign: campaign || undefined }) });
      const j = await res.json();
      if (j.error) setErr(j.error === 'not_authorized' ? 'You do not have permission to do this.' : String(j.error)); else setDone(j.data);
    } catch { setErr('Could not reach the server. Please try again.'); }
    setBusy(false);
  }
  if (done) return (
    <section className="chapter-row" style={{ display: 'block' }} aria-live="polite">
      <h2 style={{ marginTop: 0 }}>Invitation ready for {done.name}</h2>
      <p>This is a <strong>{INVITE_ROLE_LABEL[done.role as InviteRole]}</strong> invitation. The role is fixed: {done.name} cannot change it.</p>
      {done.warning && <p className="alert">{done.warning}</p>}
      <ShareBar role={done.role} link={done.link} campaign={campaign || null} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <a className="btn" href={`${detailBase}/${done.id}`}>View invitation</a>
        <button type="button" className="btn btn--accent" onClick={reset}>Create another</button>
        <a className="btn" href={listHref}>All invitations</a>
      </div>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Lost this screen? The link stays available in the invitations list.</p>
    </section>
  );
  return (
    <form onSubmit={submit} className="chapter-row" style={{ display: 'block' }}>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 12px' }}><legend className="field__label">Who are you inviting?</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {roles.map((r) => <button key={r} type="button" className={'btn' + (r === role ? ' btn--accent' : '')} aria-pressed={r === role} onClick={() => { setRole(r); setFields({}); }}>+ {INVITE_ROLE_LABEL[r]}</button>)}
        </div>
      </fieldset>
      <div className="field"><label className="field__label" htmlFor="iv-name">{NAME_LABEL[role]} *</label><input id="iv-name" className="field__input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required /></div>
      <div className="field"><label className="field__label" htmlFor="iv-email">Email (email or phone is required)</label><input id="iv-email" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label className="field__label" htmlFor="iv-phone">Phone / WhatsApp</label><input id="iv-phone" type="tel" className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      {ROLE_FIELDS[role].map((f) => (
        <div className="field" key={role + f.key}>
          <label className="field__label" htmlFor={'iv-' + f.key}>{f.label}{f.required ? ' *' : ''}</label>
          {f.kind === 'select' ? (
            <select id={'iv-' + f.key} className="field__input" value={fields[f.key] ?? ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}><option value="">Choose…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
          ) : f.kind === 'longtext' ? (
            <textarea id={'iv-' + f.key} className="field__input" rows={2} value={fields[f.key] ?? ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
          ) : (
            <input id={'iv-' + f.key} className="field__input" type={f.kind === 'date' ? 'date' : f.kind === 'number' ? 'number' : 'text'} value={fields[f.key] ?? ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
          )}
          {f.help && <small style={{ color: 'var(--slate)' }}>{f.help}</small>}
        </div>
      ))}
      <div className="field"><label className="field__label" htmlFor="iv-note">Notes (only you see these)</label><textarea id="iv-note" className="field__input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
      <div className="field"><label className="field__label" htmlFor="iv-days">Link valid for (days)</label><input id="iv-days" type="number" min={1} max={90} className="field__input" value={days} onChange={(e) => setDays(e.target.value)} /></div>
      {endpoint.startsWith('/api/admin') && <div className="field"><label className="field__label" htmlFor="iv-camp">Campaign (optional, for the acquisition dashboard)</label><input id="iv-camp" className="field__input" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="tutor-onboarding" /></div>}
      {err && <p className="alert" role="alert">{err}</p>}
      <button className="btn btn--accent" disabled={busy}>{busy ? 'Creating…' : 'Create + share invitation'}</button>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>No password is set here. The person opens the link and chooses their own.</p>
    </form>
  );
}
