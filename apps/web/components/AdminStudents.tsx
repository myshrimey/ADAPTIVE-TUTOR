'use client';

import { useState } from 'react';
import { PLANS, defaultAccessUntil, type AccessPlanCode } from '@adaptive-tutor/core';

export interface AdminStudentRow {
  id: string;
  displayName: string;
  email: string;
  planCode: string | null;
  subjectLimit: number | null;
  accessUntil: string | null;
  notes: string | null;
  subjects: string[];
  mustCompleteProfile: boolean;
}

const PLAN_OPTIONS: { code: AccessPlanCode; label: string }[] = [
  { code: 'free', label: 'Free plan (1 subject, free-tier AI only, daily limit, no mock exams)' },
  { code: 'per_subject_monthly', label: `Rs ${PLANS.per_subject_monthly.priceInr} per subject per month` },
  { code: 'five_monthly', label: `Rs ${PLANS.five_monthly.priceInr} per month, up to 5 subjects (till Feb 2027)` },
  { code: 'five_till_march', label: `Rs ${PLANS.five_till_march.priceInr} one time, up to 5 subjects (till Mar 2027)` },
  { code: 'founding_family', label: `Rs ${PLANS.founding_family.priceInr} Founding Family Programme, up to 5 subjects (till Mar 2027)` },
  { code: 'custom', label: 'Custom (you choose subjects and end date; full paid features)' },
  { code: 'grandfathered', label: 'Early access (existing students; full paid features)' },
];

function planDefaults(code: AccessPlanCode) {
  const info = (PLANS as any)[code];
  return { limit: info?.subjects ?? 1, until: defaultAccessUntil(code) ?? '' };
}

function errText(e: string) {
  const map: Record<string, string> = {
    email_already_registered: 'That email already has an account.',
    invalid_email: 'That email does not look right.',
    missing_name: 'Please enter the student’s name.',
    password_too_short: 'Password must be at least 8 characters.',
    date_after_plan_end: 'That date is after the last date this plan can run to.',
    date_required: 'This plan needs an end date.',
    invalid_date: 'Date must look like 2026-12-31.',
    not_authorized: 'You are not allowed to do this.',
  };
  return map[e] ?? e;
}

export function AdminStudents({ students }: { students: AdminStudentRow[] }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<AccessPlanCode>('five_monthly');
  const [limit, setLimit] = useState(String(planDefaults('five_monthly').limit));
  const [until, setUntil] = useState(planDefaults('five_monthly').until);
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  function pickPlan(code: AccessPlanCode) {
    setPlan(code);
    const d = planDefaults(code);
    setLimit(String(d.limit));
    setUntil(d.until);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setCreated(null);
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName: name, planCode: plan, subjectLimit: Number(limit), accessUntil: until || null, password: password || undefined, notes: notes || undefined }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.error) return setMsg({ kind: 'err', text: errText(json.error) });
    setCreated({ email: json.data.email, password: json.data.password });
    setEmail('');
    setName('');
    setPassword('');
    setNotes('');
  }

  return (
    <div>
      <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Create a student account</h2>
        <form onSubmit={create}>
          <div className="field">
            <label className="field__label">Student email</label>
            <input className="field__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field__label">Student name</label>
            <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field__label">Plan</label>
            <select className="field__input" value={plan} onChange={(e) => pickPlan(e.target.value as AccessPlanCode)}>
              {PLAN_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">How many subjects may they use?</label>
            <input className="field__input" type="number" min={1} max={10} value={limit} onChange={(e) => setLimit(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field__label">Access until (last day, e.g. 2026-11-15; blank = no end)</label>
            <input className="field__input" value={until} onChange={(e) => setUntil(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div className="field">
            <label className="field__label">Password (leave blank to generate one)</label>
            <input className="field__input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label className="field__label">Note (optional, only you see it)</label>
            <input className="field__input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {msg && <p className={msg.kind === 'err' ? 'alert' : ''}>{msg.text}</p>}
          <button className="btn btn--accent" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        {created && (
          <div className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--ink)', marginTop: 'var(--space-2)' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Account created. Copy this now — the password is shown only once.</p>
            <p style={{ margin: '0.3rem 0 0', fontFamily: 'monospace' }}>
              Email: {created.email}
              <br />
              Password: {created.password}
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem' }}>The student should sign in, complete their profile, and may change the password there.</p>
          </div>
        )}
      </section>

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Students ({students.length})</h2>
      {students.map((s) => (
        <StudentRow key={s.id} s={s} />
      ))}
    </div>
  );
}

function StudentRow({ s }: { s: AdminStudentRow }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<AccessPlanCode>((s.planCode as AccessPlanCode) ?? 'custom');
  const [limit, setLimit] = useState(String(s.subjectLimit ?? 1));
  const [until, setUntil] = useState(s.accessUntil ?? '');
  const [notes, setNotes] = useState(s.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/students/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planCode: plan, subjectLimit: Number(limit), accessUntil: until || null, notes: notes || undefined }),
    });
    const json = await res.json();
    setBusy(false);
    setMsg(json.error ? errText(json.error) : 'Saved. Refresh to see it in the list.');
  }
  async function reset() {
    if (!window.confirm(`Set a new password for ${s.email}? Their old password will stop working.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/students/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset_password' }) });
    const json = await res.json();
    setBusy(false);
    if (json.error) setMsg(errText(json.error));
    else setNewPw(json.data.password);
  }

  const today = new Date().toISOString().slice(0, 10);
  const status = !s.planCode ? 'No plan' : s.accessUntil && s.accessUntil < today ? 'Expired' : 'Active';
  return (
    <div className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <strong>{s.displayName}</strong> <span style={{ color: 'var(--slate)' }}>{s.email}</span>
          <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
            {status} · {s.planCode ?? 'no plan'} · up to {s.subjectLimit ?? 0} subject(s) · until {s.accessUntil ?? 'no end date'}
            {s.mustCompleteProfile ? ' · has not completed profile yet' : ''}
          </div>
          <div style={{ fontSize: '0.85rem' }}>Subjects: {s.subjects.length ? s.subjects.join(', ') : 'none chosen yet'}</div>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Edit plan / password'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: '0.6rem' }}>
          <div className="field">
            <label className="field__label">Plan</label>
            <select className="field__input" value={plan} onChange={(e) => setPlan(e.target.value as AccessPlanCode)}>
              {PLAN_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">Subjects allowed</label>
            <input className="field__input" type="number" min={1} max={10} value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Access until (YYYY-MM-DD, blank = no end)</label>
            <input className="field__input" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Note</label>
            <input className="field__input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="hero__actions">
            <button className="btn btn--accent btn--small" onClick={save} disabled={busy}>
              Save plan
            </button>
            <button className="btn btn--ghost btn--small" onClick={reset} disabled={busy}>
              Set a new password
            </button>
          </div>
          {msg && <p style={{ fontSize: '0.9rem' }}>{msg}</p>}
          {newPw && (
            <p className="alert" style={{ fontFamily: 'monospace' }}>
              New password (shown once): {newPw}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
