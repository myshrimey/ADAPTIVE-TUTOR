'use client';
import { useState } from 'react';
import { E, type ELang } from '@adaptive-tutor/core';
async function call(body: unknown) { return (await fetch('/api/engagement/friend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(); }

export function FriendCreate({ subjects, lang }: { subjects: { id: string; name: string }[]; lang: ELang }) {
  const [sid, setSid] = useState(subjects[0]?.id ?? ''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const L = (k: string) => E(k, lang);
  async function go() { setBusy(true); const r = await call({ action: 'create', subjectId: sid }); setBusy(false); if (r.error) setMsg(r.error); else location.reload(); }
  if (!subjects.length) return null;
  return <p><select className="field__input" style={{ maxWidth: 220 }} value={sid} onChange={(e) => setSid(e.target.value)} aria-label={L('fr.pick')}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select> <button className="btn btn--accent btn--small" disabled={busy} onClick={go}>{L('fr.create')}</button>{msg && <span className="alert" style={{ display: 'block' }}>{msg}</span>}</p>;
}
export function FriendJoin({ lang }: { lang: ELang }) {
  const [code, setCode] = useState(''); const [msg, setMsg] = useState('');
  async function go() { const r = await call({ action: 'join', code }); if (r.error) setMsg(r.error); else location.reload(); }
  return <p><input className="field__input" style={{ maxWidth: 180, textTransform: 'uppercase' }} maxLength={9} value={code} onChange={(e) => setCode(e.target.value)} placeholder={E('fr.enter', lang)} /> <button className="btn btn--ghost btn--small" onClick={go}>{E('fr.join', lang)}</button>{msg && <span className="alert" style={{ display: 'block' }}>{msg}</span>}</p>;
}
export function FriendCancel({ id, lang }: { id: string; lang: ELang }) {
  return <button className="btn btn--ghost btn--small" onClick={async () => { await call({ action: 'cancel', id }); location.reload(); }}>{E('fr.close', lang)}</button>;
}
