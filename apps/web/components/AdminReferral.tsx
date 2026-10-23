'use client';
import { useState } from 'react';

type S = { links_on: boolean; rewards_on: boolean; days_referrer: number; days_referred: number; max_rewarded_per_referrer: number; max_per_ip: number; min_answers: number };
type Ev = { id: string; referrerRole: string; referredRole: string; status: string; note: string | null; createdAt: string };

export function AdminReferral({ settings, events, byRole }: { settings: S; events: Ev[]; byRole: Record<string, { invited: number; qualified: number; rewarded: number }> }) {
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState('');
  async function call(body: object) {
    const r = await fetch('/api/admin/referral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  }
  const num = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  const row: React.CSSProperties = { display: 'flex', gap: '0.6rem', alignItems: 'center', margin: '0.4rem 0', flexWrap: 'wrap' };
  return (
    <div>
      <h2>Settings</h2>
      <div style={row}><label><input type="checkbox" checked={s.links_on} onChange={(e) => setS({ ...s, links_on: e.target.checked })} /> Invite links are on</label></div>
      <div style={row}><label><input type="checkbox" checked={s.rewards_on} onChange={(e) => setS({ ...s, rewards_on: e.target.checked })} /> <strong>Give extra access days automatically</strong> (OFF until you decide the days below)</label></div>
      <div style={row}><label>Days for the person who invited <input className="field__input" style={{ width: 80 }} type="number" min={0} max={90} value={s.days_referrer} onChange={num('days_referrer')} /></label>
        <label>Days for the friend who joined <input className="field__input" style={{ width: 80 }} type="number" min={0} max={90} value={s.days_referred} onChange={num('days_referred')} /></label></div>
      <div style={row}><label>Most rewarded invites per person <input className="field__input" style={{ width: 80 }} type="number" min={0} max={100} value={s.max_rewarded_per_referrer} onChange={num('max_rewarded_per_referrer')} /></label>
        <label>Most sign-ups from one internet address per inviter <input className="field__input" style={{ width: 80 }} type="number" min={1} max={50} value={s.max_per_ip} onChange={num('max_per_ip')} /></label>
        <label>Answers the friend&apos;s diagnostic must have <input className="field__input" style={{ width: 80 }} type="number" min={1} max={50} value={s.min_answers} onChange={num('min_answers')} /></label></div>
      <p>
        <button className="btn btn--accent" onClick={async () => { const j = await call({ action: 'save', settings: s }); setMsg(j.error ? 'Problem: ' + j.error : 'Saved.'); if (j.data) setS(j.data); }}>Save settings</button>{' '}
        <button className="btn btn--ghost" onClick={async () => { const j = await call({ action: 'reward_all' }); setMsg(j.error ? 'Problem: ' + j.error : `Gave out rewards for ${j.data.rewarded} qualified invites (needs rewards switched on and saved).`); }}>Give rewards to friends who already qualified</button>
      </p>
      {msg && <p role="status">{msg}</p>}
      <h2>By who invited</h2>
      <table style={{ borderCollapse: 'collapse' }}><thead><tr style={{ textAlign: 'left' }}><th style={{ paddingRight: 16 }}>Role</th><th style={{ paddingRight: 16 }}>Invited</th><th style={{ paddingRight: 16 }}>Finished first diagnostic</th><th>Rewarded</th></tr></thead>
        <tbody>{Object.entries(byRole).map(([r, v]) => <tr key={r}><td>{r}</td><td>{v.invited}</td><td>{v.qualified}</td><td>{v.rewarded}</td></tr>)}{!Object.keys(byRole).length && <tr><td colSpan={4}>No invites yet.</td></tr>}</tbody></table>
      <h2>Latest invites (no names are shown)</h2>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}><thead><tr style={{ textAlign: 'left' }}><th style={{ paddingRight: 12 }}>When</th><th style={{ paddingRight: 12 }}>Invited by</th><th style={{ paddingRight: 12 }}>Friend is</th><th style={{ paddingRight: 12 }}>Status</th><th>Note</th></tr></thead>
        <tbody>{events.slice(0, 100).map((e) => (
          <tr key={e.id}><td style={{ paddingRight: 12 }}>{e.createdAt.slice(0, 10)}</td><td>{e.referrerRole}</td><td>{e.referredRole}</td><td>{e.status}</td>
            <td>{e.note ?? ''}{e.status === 'held' && /teacher, tutor or centre/.test(e.note ?? '') && <> <button className="btn btn--ghost btn--small" onClick={async () => { const n = window.prompt('What did you give them? (short note)'); if (!n) return; const j = await call({ action: 'resolve', id: e.id, note: n }); setMsg(j.error ? 'Problem: ' + j.error : 'Marked as settled. Reload to see it.'); }}>Mark as settled</button></>}</td></tr>
        ))}</tbody></table>
    </div>
  );
}
