'use client';
import { useState } from 'react';
import { PERMISSIONS, PERMISSION_LABEL, TEAM_PRESETS, pagesOpenedBy, type Permission } from '@adaptive-tutor/core/admin-team/permissions';

interface M { id: string; email: string; name: string; title: string | null; department: string | null; responsibilities: string | null; custom_responsibilities: string | null; permissions: Permission[]; status: string; notes: string | null }
export function TeamManager({ team }: { team: M[] }) {
  const empty = { email: '', name: '', title: '', department: '', responsibilities: '', custom_responsibilities: '', notes: '', status: 'active', permissions: [] as Permission[] };
  const [f, setF] = useState<any>(empty); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const toggle = (p: Permission) => setF({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x: string) => x !== p) : [...f.permissions, p] });
  const preset = (id: string) => { const p = TEAM_PRESETS.find((x) => x.id === id); if (p) setF({ ...f, department: p.department || f.department, permissions: [...p.permissions] }); };
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); const r = await fetch('/api/admin/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }).then((x) => x.json()).catch(() => ({ error: 'failed' })); setBusy(false); if (r.error) setMsg('Could not save: ' + r.error.replace(/_/g, ' ')); else location.reload(); }
  async function remove(id: string) { if (!confirm('Remove this person from the team?')) return; await fetch('/api/admin/team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); location.reload(); }
  return (
    <div>
      <table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Permissions</th><th>Status</th><th></th></tr></thead><tbody>
        {team.map((m) => <tr key={m.id}><td>{m.name}{m.title ? ` (${m.title})` : ''}</td><td>{m.email}</td><td>{m.department ?? '—'}</td><td>{m.permissions.join(', ') || 'none'}</td><td>{m.status}</td>
          <td><button className="btn" onClick={() => setF({ ...empty, ...m, title: m.title ?? '', department: m.department ?? '', responsibilities: m.responsibilities ?? '', custom_responsibilities: m.custom_responsibilities ?? '', notes: m.notes ?? '' })}>Edit</button> <button className="btn" onClick={() => remove(m.id)}>Remove</button></td></tr>)}
        {team.length === 0 && <tr><td colSpan={6}>No team members yet. You (the Super Admin) can always open everything.</td></tr>}
      </tbody></table>
      <form onSubmit={save} className="chapter-row" style={{ display: 'block', marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Add or change a team member</h2>
        <div className="field"><label className="field__label" htmlFor="tm-name">Name *</label><input id="tm-name" className="field__input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div className="field"><label className="field__label" htmlFor="tm-email">Email they sign in with *</label><input id="tm-email" type="email" className="field__input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div className="field"><label className="field__label" htmlFor="tm-title">Role / title</label><input id="tm-title" className="field__input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label className="field__label" htmlFor="tm-pre">Start from a template</label><select id="tm-pre" className="field__input" defaultValue="" onChange={(e) => preset(e.target.value)}><option value="">Choose…</option>{TEAM_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}: {p.note}</option>)}</select></div>
        <div className="field"><label className="field__label" htmlFor="tm-dep">Department</label><input id="tm-dep" className="field__input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
        <fieldset style={{ border: 0, padding: 0 }}><legend className="field__label">Permissions (the server checks these on every page and action)</legend>
          {PERMISSIONS.map((p) => <label key={p} style={{ display: 'block' }}><input type="checkbox" checked={f.permissions.includes(p)} onChange={() => toggle(p)} /> {PERMISSION_LABEL[p]}{pagesOpenedBy(p) === 0 && <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}> (does not open any admin page yet: those pages are still for you only)</span>}</label>)}</fieldset>
        <div className="field"><label className="field__label" htmlFor="tm-resp">Responsibilities</label><textarea id="tm-resp" className="field__input" rows={2} value={f.responsibilities} onChange={(e) => setF({ ...f, responsibilities: e.target.value })} /></div>
        <div className="field"><label className="field__label" htmlFor="tm-cust">Custom responsibilities</label><textarea id="tm-cust" className="field__input" rows={2} value={f.custom_responsibilities} onChange={(e) => setF({ ...f, custom_responsibilities: e.target.value })} /></div>
        <div className="field"><label className="field__label" htmlFor="tm-notes">Notes</label><textarea id="tm-notes" className="field__input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="field"><label className="field__label" htmlFor="tm-st">Status</label><select id="tm-st" className="field__input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
        {msg && <p className="alert" role="alert">{msg}</p>}
        <button className="btn btn--accent" disabled={busy}>Save team member</button> <button type="button" className="btn" onClick={() => setF(empty)}>Clear</button>
        <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>The person must already have a Sahayak login with this email (create one with an invitation, then add them here). Pages without a permission listed (for example payments approval, settings, this page) stay Super Admin only.</p>
      </form>
    </div>
  );
}
