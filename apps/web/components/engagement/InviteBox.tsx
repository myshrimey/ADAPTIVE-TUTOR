'use client';
import { useState } from 'react';
import { E, type ELang } from '@adaptive-tutor/core';
export function InviteBox({ code, usedACode, lang }: { code: string; usedACode: boolean; lang: ELang }) {
  const [c, setC] = useState(''); const [msg, setMsg] = useState(''); const [copied, setCopied] = useState(false);
  async function redeem() { const r = await (await fetch('/api/engagement/referral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c }) })).json(); if (r.error) setMsg(r.error); else location.reload(); }
  async function copy() { try { await navigator.clipboard.writeText(E('rf.msg', lang, { c: code })); setCopied(true); } catch { setCopied(false); } }
  return (
    <div>
      <p>{E('rf.yourCode', lang)}: <strong style={{ letterSpacing: 2, fontSize: '1.2rem' }}>{code}</strong> <button className="btn btn--ghost btn--small" onClick={copy}>{E('rf.copy', lang)}</button>{copied ? ' ✓' : ''}</p>
      {!usedACode && <p><input className="field__input" style={{ maxWidth: 180, textTransform: 'uppercase' }} maxLength={9} value={c} onChange={(e) => setC(e.target.value)} placeholder={E('fr.enter', lang)} /> <button className="btn btn--ghost btn--small" onClick={redeem}>{E('fr.join', lang)}</button></p>}
      {msg && <p className="alert">{msg}</p>}
    </div>
  );
}
