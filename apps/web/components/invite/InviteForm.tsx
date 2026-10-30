'use client';
import { useState } from 'react';
import { ROLE_FIELDS, INVITE_ROLE_LABEL, type InviteRole } from '@adaptive-tutor/core/invitations/constants';

const ERR: Record<string, string> = {
  username_taken: 'That username is taken. Please choose another.', consent_required: 'Please tick the box to continue.', register_failed: 'Something went wrong. Please try again, or contact the Sahayak administrator.',
  create_failed: 'Something went wrong. Please try again.', weak_password: 'Please choose a longer password (at least 8 characters).',
};
// The role is shown, never asked. It is read again from the invitation on the server when this form is sent.
export function InviteForm({ token, role, name, filled }: { token: string; role: InviteRole; name: string; filled: Record<string, string> }) {
  const [f, setF] = useState<Record<string, string>>({}); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [existing, setExisting] = useState(''); const [started, setStarted] = useState(false);
  const ask = ROLE_FIELDS[role].filter((x) => !filled[x.key]);
  const begin = () => { if (!started) { setStarted(true); fetch('/api/invite/started', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => {}); } };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/invite/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, username, password, consent, fields: f, website: '' }) }).then((x) => x.json());
      if (r.error === 'existing_account') { setExisting(r.message); setBusy(false); return; }
      if (r.error) { setErr(r.message || ERR[r.error] || 'Please check the details and try again.'); setBusy(false); return; }
      const l = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: username, password }) }).then((x) => x.json()).catch(() => ({ error: 'x' }));
      window.location.href = l.error ? '/' : role === 'student' ? '/dashboard' : role === 'teacher' ? '/teacher' : '/' + role;
    } catch { setErr('Could not reach the server. Please try again.'); setBusy(false); }
  }
  if (existing) return (<div><p className="alert" role="alert">{existing}</p><p><a className="btn btn--accent" href={role === 'student' ? '/' : `/${role}/login`}>Go to sign in</a></p></div>);
  return (
    <form onSubmit={submit} onChange={begin}>
      <p style={{ fontSize: 'var(--step-1)' }}>You have been invited to join Sahayak as {/^[aeiou]/i.test(INVITE_ROLE_LABEL[role]) ? 'an' : 'a'}:</p>
      <p style={{ fontSize: 'var(--step-2)', fontWeight: 700, margin: '0 0 12px' }} aria-label={`Your role: ${INVITE_ROLE_LABEL[role]}`}>{INVITE_ROLE_LABEL[role]}</p>
      <p style={{ color: 'var(--slate)', marginTop: 0 }}>This was set by the person who invited you, so there is nothing to choose. Registering for: <strong>{name}</strong></p>
      {ask.map((x) => (
        <div className="field" key={x.key}><label className="field__label" htmlFor={'f-' + x.key}>{x.label}{x.required ? ' *' : ''}</label>
          {x.kind === 'select' ? <select id={'f-' + x.key} className="field__input" required={x.required} value={f[x.key] ?? ''} onChange={(e) => setF({ ...f, [x.key]: e.target.value })}><option value="">Choose…</option>{x.options!.map((o) => <option key={o}>{o}</option>)}</select>
            : <input id={'f-' + x.key} className="field__input" required={x.required} type={x.kind === 'date' ? 'date' : x.kind === 'number' ? 'number' : 'text'} value={f[x.key] ?? ''} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />}
          {x.help && <small style={{ color: 'var(--slate)' }}>{x.help}</small>}</div>
      ))}
      <div className="field"><label className="field__label" htmlFor="f-user">Choose a username *</label><input id="f-user" className="field__input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></div>
      <div className="field"><label className="field__label" htmlFor="f-pass">Choose a password * (at least 8 characters)</label><input id="f-pass" type="password" className="field__input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} /></div>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '0.6rem 0' }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '0.25rem' }} />
        <span style={{ fontSize: '0.9rem' }}>I agree to the <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy policy</a>.{role === 'student' ? ' A parent or guardian knows I am joining.' : ''}</span></label>
      {err && <p className="alert" role="alert">{err}</p>}
      <button className="btn btn--accent" disabled={busy || !consent}>{busy ? 'Creating…' : 'Complete registration'}</button>
    </form>
  );
}
