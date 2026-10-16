'use client';

import { useState } from 'react';

export interface AdminTeacherRow {
  userId: string;
  displayName: string;
  email: string;
  qualification: string | null;
  school: string | null;
  subjects: string | null;
  status: string;
  reviewsTotal: number;
  reviews30: number;
}

export function AdminTeachers({ teachers }: { teachers: AdminTeacherRow[] }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setCreated(null);
    const res = await fetch('/api/admin/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, displayName: name, password: password || undefined }) });
    const json = await res.json();
    setBusy(false);
    if (json.error) return setMsg(json.error === 'email_already_registered' ? 'That email already has an account.' : json.error);
    setCreated(json.data);
    setEmail('');
    setName('');
    setPassword('');
  }
  async function act(id: string, action: 'approve' | 'suspend' | 'reset_password') {
    if (action === 'reset_password' && !window.confirm('Set a new password for this teacher?')) return;
    const res = await fetch(`/api/admin/teachers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const json = await res.json();
    setRowMsg((m) => ({ ...m, [id]: json.error ? json.error : action === 'reset_password' ? `New password (shown once): ${json.data.password}` : `Now ${json.data.status}. Refresh to update the list.` }));
  }

  return (
    <div>
      <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Create a teacher account</h2>
        <form onSubmit={create}>
          <div className="field"><label className="field__label">Teacher name</label><input className="field__input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field"><label className="field__label">Email</label><input className="field__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label className="field__label">Password (blank = generate one)</label><input className="field__input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></div>
          {msg && <p className="alert">{msg}</p>}
          <button className="btn btn--accent" disabled={busy}>{busy ? 'Creating…' : 'Create approved teacher'}</button>
        </form>
        {created && (
          <p className="alert" style={{ fontFamily: 'monospace', marginTop: '0.6rem' }}>
            Created. Copy now (password shown once): {created.email} / {created.password}
          </p>
        )}
      </section>

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Teachers ({teachers.length})</h2>
      {teachers.length === 0 && <p style={{ color: 'var(--slate)' }}>No teachers yet.</p>}
      {teachers.map((t) => (
        <div key={t.userId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <strong>{t.displayName}</strong> <span style={{ color: 'var(--slate)' }}>{t.email}</span> · <strong>{t.status}</strong>
          <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
            {[t.qualification, t.school, t.subjects].filter(Boolean).join(' · ') || 'No details given'} · reviews: {t.reviewsTotal} total, {t.reviews30} in last 30 days
          </div>
          <div className="hero__actions" style={{ marginTop: '0.4rem' }}>
            {t.status !== 'approved' && <button className="btn btn--accent btn--small" onClick={() => act(t.userId, 'approve')}>Approve</button>}
            {t.status === 'approved' && <button className="btn btn--ghost btn--small" onClick={() => act(t.userId, 'suspend')}>Suspend</button>}
            <button className="btn btn--ghost btn--small" onClick={() => act(t.userId, 'reset_password')}>Set new password</button>
          </div>
          {rowMsg[t.userId] && <p style={{ fontSize: '0.9rem', fontFamily: rowMsg[t.userId].startsWith('New password') ? 'monospace' : undefined }}>{rowMsg[t.userId]}</p>}
        </div>
      ))}
    </div>
  );
}
