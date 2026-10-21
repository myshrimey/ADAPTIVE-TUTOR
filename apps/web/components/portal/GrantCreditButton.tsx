'use client';
import { useState } from 'react';

const TEXT: Record<string, string> = {
  no_org_credits: 'No credits left in your pool this month.', no_plan: 'Your plan is not active.', plan_expired: 'Your plan has ended. Please renew.',
  not_linked: 'This student is no longer linked to you.', grant_failed: 'Could not do that. Please try again.',
};
export function GrantCreditButton({ studentId }: { studentId: string }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg('');
    const r = await fetch('/api/portal/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, grantId: crypto.randomUUID() }) }).then((x) => x.json()).catch(() => null);
    setMsg(r?.error ? (TEXT[r.error] ?? 'Could not do that.') : `Given. ${r.data.balance} left in your pool.`); setBusy(false);
  }
  return <span><button className="btn btn--ghost btn--small" disabled={busy} onClick={go}>Give 1 mock credit</button>{msg && <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}>{msg}</span>}</span>;
}
