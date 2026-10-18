'use client';

import { useEffect, useState } from 'react';

// Download a copy of the student's data, or ask for it to be deleted.
export default function MyDataPage() {
  const [status, setStatus] = useState<{ status: string; requested_at: string } | null>(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/student/delete-request').then((r) => r.json()).then((j) => setStatus(j.data ?? null)).catch(() => {});
  }, []);
  async function request() {
    const res = await fetch('/api/student/delete-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: text.trim() }) });
    const j = await res.json();
    if (j.error) return setMsg(j.error === 'confirm_required' ? 'Please type DELETE in capital letters to confirm.' : 'Something went wrong. Please try again or contact us.');
    setStatus({ status: 'requested', requested_at: new Date().toISOString() });
    setMsg('Your request is recorded. The founder will delete the data and confirm with you.');
  }
  const open = status?.status === 'requested';
  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: 640, paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>My data</h1>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Download a copy</h2>
        <p style={{ color: 'var(--slate)' }}>A file with the learning data Sahayak holds for this student: profile, sessions, answers, mock exams, written answers and plan details.</p>
        <p><a className="btn btn--accent" href="/api/student/export">Download my data</a></p>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Ask us to delete the data</h2>
        <p style={{ color: 'var(--slate)' }}>Deleting removes the student&apos;s learning records, plan and payment records on our side, and the login. It cannot be undone, so download a copy first. The founder carries it out by hand and tells you when it is done.</p>
        {open ? <p><strong>A deletion request is already open.</strong> We will confirm when it is done.</p> : (
          <div>
            <label>Type DELETE to confirm <input value={text} onChange={(e) => setText(e.target.value)} style={{ marginLeft: 8 }} /></label>
            <p><button type="button" className="btn btn--ghost" onClick={request}>Request deletion</button></p>
          </div>
        )}
        {msg && <p role="status">{msg}</p>}
      </div>
    </main>
  );
}
