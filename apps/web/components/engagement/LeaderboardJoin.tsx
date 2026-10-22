'use client';
import { useState } from 'react';
import { E, type ELang } from '@adaptive-tutor/core';
export function LeaderboardJoin({ optedIn, nickname, lang = 'en' }: { optedIn: boolean; nickname: string | null; lang?: ELang }) {
  const L = (k: string) => E(k, lang);
  const [nick, setNick] = useState(nickname ?? ''); const [msg, setMsg] = useState('');
  async function call(body: any) { const r = await (await fetch('/api/engagement/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(); return r; }
  async function suggest() { const r = await call({ action: 'suggest' }); if (r.data) setNick(r.data.nickname); }
  async function join() { const r = await call({ action: 'join', nickname: nick }); if (r.error) setMsg(r.error); else location.reload(); }
  async function leave() { await call({ action: 'leave' }); location.reload(); }
  if (optedIn) return <p>{L('lb.on')} <strong>{nickname}</strong>. <button className="btn btn--ghost btn--small" onClick={leave}>{L('lb.leave')}</button></p>;
  return (
    <div>
      <p style={{ color: 'var(--slate)' }}>{L('lb.intro')}</p>
      <input className="field__input" style={{ maxWidth: 260 }} value={nick} onChange={(e) => setNick(e.target.value)} placeholder={L('lb.nick')} /> <button className="btn btn--ghost btn--small" onClick={suggest}>{L('lb.suggest')}</button> <button className="btn btn--accent btn--small" onClick={join}>{L('lb.join')}</button>
      {msg && <p className="alert">{msg}</p>}
    </div>
  );
}
