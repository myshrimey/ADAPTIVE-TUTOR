'use client';
import { useState } from 'react';
export function LeaderboardJoin({ optedIn, nickname }: { optedIn: boolean; nickname: string | null }) {
  const [nick, setNick] = useState(nickname ?? ''); const [msg, setMsg] = useState('');
  async function call(body: any) { const r = await (await fetch('/api/engagement/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(); return r; }
  async function suggest() { const r = await call({ action: 'suggest' }); if (r.data) setNick(r.data.nickname); }
  async function join() { const r = await call({ action: 'join', nickname: nick }); if (r.error) setMsg(r.error); else location.reload(); }
  async function leave() { await call({ action: 'leave' }); location.reload(); }
  if (optedIn) return <p>You are on the class board as <strong>{nickname}</strong>. <button className="btn btn--ghost btn--small" onClick={leave}>Leave the board</button></p>;
  return (
    <div>
      <p style={{ color: 'var(--slate)' }}>The class board is optional. Others see only your nickname and learning scores, never your name, contact details or weak topics. You can leave any time.</p>
      <input className="field__input" style={{ maxWidth: 260 }} value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Choose a nickname" /> <button className="btn btn--ghost btn--small" onClick={suggest}>Suggest one</button> <button className="btn btn--accent btn--small" onClick={join}>Join the board</button>
      {msg && <p className="alert">{msg}</p>}
    </div>
  );
}
