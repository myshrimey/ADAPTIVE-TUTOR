'use client';
import { useState } from 'react';
export function AssignmentManager({ teachers, students, rows }: { teachers: { user_id: string; display_name: string }[]; students: { id: string; display_name: string }[]; rows: any[] }) {
  const [t, setT] = useState(''); const [s, setS] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const ERR: Record<string, string> = { already_assigned: 'This teacher is already assigned to this student.', teacher_not_approved: 'That teacher is not approved yet.', not_a_teacher: 'That account is not a teacher.', student_not_found: 'Student not found.', not_authorized: 'You do not have permission.' };
  async function add(e: React.FormEvent) { e.preventDefault(); setBusy(true); const r = await fetch('/api/admin/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherUser: t, studentId: s, note }) }).then((x) => x.json()).catch(() => ({ error: 'failed' })); setBusy(false); if (r.error) setMsg(ERR[r.error] ?? 'Could not save.'); else location.reload(); }
  async function end(id: string) { if (!confirm('End this assignment?')) return; await fetch('/api/admin/assignments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); location.reload(); }
  return (
    <div>
      <form onSubmit={add} className="chapter-row" style={{ display: 'block' }}>
        <div className="field"><label className="field__label" htmlFor="as-t">Teacher</label><select id="as-t" className="field__input" value={t} onChange={(e) => setT(e.target.value)} required><option value="">Choose…</option>{teachers.map((x) => <option key={x.user_id} value={x.user_id}>{x.display_name}</option>)}</select></div>
        <div className="field"><label className="field__label" htmlFor="as-s">Student</label><select id="as-s" className="field__input" value={s} onChange={(e) => setS(e.target.value)} required><option value="">Choose…</option>{students.map((x) => <option key={x.id} value={x.id}>{x.display_name}</option>)}</select></div>
        <div className="field"><label className="field__label" htmlFor="as-n">Note</label><input id="as-n" className="field__input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></div>
        {msg && <p className="alert" role="alert">{msg}</p>}
        <button className="btn btn--accent" disabled={busy}>Assign</button>
      </form>
      <table className="data-table" style={{ marginTop: 16 }}><thead><tr><th>Teacher</th><th>Student</th><th>Status</th><th>Since</th><th></th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td>{r.teacher_name}</td><td>{r.student_name}</td><td>{r.status}</td><td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td><td>{r.status === 'active' && <button className="btn" onClick={() => end(r.id)}>End</button>}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={5}>No assignments yet.</td></tr>}
      </tbody></table>
    </div>
  );
}
