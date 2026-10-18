'use client';

import { useState } from 'react';

export function LinkStudentForm({ disabled }: { disabled?: boolean }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const errors: Record<string, string> = {
    invalid_code: 'That code did not work. It may be mistyped, already used, expired, or made for a different kind of account.',
    too_many_attempts: 'Too many tries. Please wait an hour and try again.',
    awaiting_approval: 'Your account is still waiting for approval.',
    suspended: 'This account is not active.',
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/portal/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const json = await res.json();
      if (json.error) setMsg({ ok: false, text: errors[json.error] ?? 'Could not add the student. Please try again.' });
      else { setMsg({ ok: true, text: `${json.data.studentName} has been added.` }); setCode(''); setTimeout(() => window.location.reload(), 900); }
    } catch { setMsg({ ok: false, text: 'Could not reach the server.' }); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="chapter-row" style={{ display: 'block' }}>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>Add a student</h2>
      <p style={{ color: 'var(--slate)', marginTop: 0 }}>Ask the student to open <strong>Sharing</strong> in their account and make a code for you. Type it here. A code works once and expires in 7 days.</p>
      <div className="field"><label className="field__label" htmlFor="lc">One-time code</label><input id="lc" className="field__input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD-2345" autoComplete="off" autoCapitalize="characters" disabled={disabled} /></div>
      {msg && <p className={msg.ok ? undefined : 'alert'}>{msg.text}</p>}
      <button className="btn btn--accent" disabled={busy || disabled || !code.trim()}>{busy ? 'Checking…' : 'Add student'}</button>
    </form>
  );
}
