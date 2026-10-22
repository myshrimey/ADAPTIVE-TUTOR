'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ReferralReward({ id, status, note }: { id: string; status: string; note: string | null }) {
  const r = useRouter(); const [s, setS] = useState(status); const [n, setN] = useState(note ?? ''); const [msg, setMsg] = useState('');
  async function save() { const x = await (await fetch('/api/admin/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'referral_reward', id, status: s, note: n }) })).json(); setMsg(x.error ? `Not saved: ${x.error}` : 'Saved.'); if (!x.error) r.refresh(); }
  return <span><select className="field__input" value={s} onChange={(e) => setS(e.target.value)}><option value="none">No reward</option><option value="under_review">Under review</option><option value="approved">Approved by me</option><option value="declined">Declined</option></select> <input className="field__input" style={{ width: 200 }} value={n} maxLength={300} onChange={(e) => setN(e.target.value)} placeholder="Note (what you decided and why)" /> <button className="btn btn--ghost btn--small" onClick={save}>Save</button> {msg}</span>;
}
