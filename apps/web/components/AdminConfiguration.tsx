'use client';
import { useState } from 'react';

type Rec = Record<string, any>;
export function AdminConfiguration({ exams, versions, prices, products, subjects }: { exams: Rec[]; versions: Rec[]; prices: Rec[]; products: { code: string; name: string }[]; subjects: { id: string; name: string }[] }) {
  const [msg, setMsg] = useState('');
  const [ex, setEx] = useState<Rec>({ board: 'CBSE', academic_year: '2026-27', class_level: '10', exam_type: 'board', session_label: '', start_date: '', end_date: '', subjects: '', rules: '', status: 'draft' });
  const [cv, setCv] = useState<Rec>({ board: 'CBSE', academic_year: '2026-27', class_level: '10', subject_id: '', subject_label: '', language: 'en', source_reference: '', notes: '' });
  const [pr, setPr] = useState<Rec>({ country: '', currency: 'USD', product_code: products[0]?.code ?? '', price: '', tax_pct: 0, payment_method: '', tier: '', promotion: '', active: false, note: '' });
  async function call(body: object, done: string) {
    const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); setMsg(j.error ? 'Problem: ' + j.error : done + ' Reload the page to see it in the list.');
  }
  const f = (st: Rec, set: (v: Rec) => void, k: string, label: string, type = 'text', w = 150) => (
    <label style={{ fontSize: '0.85rem', display: 'inline-block', margin: '0 0.6rem 0.4rem 0' }}>{label}<br /><input className="field__input" style={{ width: w }} type={type} value={st[k] ?? ''} onChange={(e) => set({ ...st, [k]: e.target.value })} /></label>
  );
  const box: React.CSSProperties = { border: '1px solid var(--line, #cbd5e1)', borderRadius: 12, padding: '1rem', margin: '1rem 0' };
  const td: React.CSSProperties = { padding: '0.2rem 0.7rem 0.2rem 0', verticalAlign: 'top', fontSize: '0.88rem' };
  return (
    <div>
      {msg && <p role="status" className="alert">{msg}</p>}
      <div style={box}>
        <h2>Exam sessions</h2>
        <p style={{ color: 'var(--slate)' }}>One row per examination session (for example Board exam 1 and Board exam 2). Dates are typed by you from the official CBSE notice; none are assumed. Rules are optional JSON such as {'{"duration_minutes": 180}'}.</p>
        {f(ex, setEx, 'board', 'Board', 'text', 90)}{f(ex, setEx, 'academic_year', 'Academic year', 'text', 100)}{f(ex, setEx, 'class_level', 'Class', 'text', 70)}{f(ex, setEx, 'exam_type', 'Type', 'text', 100)}{f(ex, setEx, 'session_label', 'Session name', 'text', 170)}
        {f(ex, setEx, 'start_date', 'Start (YYYY-MM-DD)', 'text', 140)}{f(ex, setEx, 'end_date', 'End (YYYY-MM-DD)', 'text', 140)}{f(ex, setEx, 'subjects', 'Subjects (comma separated)', 'text', 260)}{f(ex, setEx, 'rules', 'Rules (JSON, optional)', 'text', 260)}
        <label style={{ fontSize: '0.85rem' }}>Status <select className="field__input" value={ex.status} onChange={(e) => setEx({ ...ex, status: e.target.value })}><option>draft</option><option>published</option><option>closed</option></select></label>{' '}
        <button className="btn btn--accent btn--small" onClick={() => call({ action: 'exam_save', session: ex }, 'Saved.')}>Add exam session</button>
        <table style={{ borderCollapse: 'collapse', marginTop: '0.6rem' }}><tbody>{exams.map((e) => (
          <tr key={e.id}><td style={td}>{e.board} {e.academic_year} class {e.class_level}</td><td style={td}>{e.session_label} ({e.exam_type})</td><td style={td}>{e.start_date ?? 'no date'} to {e.end_date ?? 'no date'}</td><td style={td}>{e.status}</td><td style={td}><button className="btn btn--ghost btn--small" onClick={() => confirm('Delete this exam session?') && call({ action: 'exam_delete', id: e.id }, 'Deleted.')}>Delete</button></td></tr>
        ))}{!exams.length && <tr><td style={td}>None yet.</td></tr>}</tbody></table>
      </div>

      <div style={box}>
        <h2>Curriculum versions</h2>
        <p style={{ color: 'var(--slate)' }}>A register of which syllabus version exists for each board, year, class, subject and language, where it came from, and who approved it. A version moves draft → needs review → approved → published, and cannot be approved without a source. The questions and lessons themselves still come from the seed files; publishing here records the decision.</p>
        {f(cv, setCv, 'board', 'Board', 'text', 90)}{f(cv, setCv, 'academic_year', 'Academic year', 'text', 100)}{f(cv, setCv, 'class_level', 'Class', 'text', 70)}{f(cv, setCv, 'language', 'Language', 'text', 70)}
        <label style={{ fontSize: '0.85rem', marginRight: '0.6rem' }}>Subject<br /><select className="field__input" value={cv.subject_id} onChange={(e) => setCv({ ...cv, subject_id: e.target.value })}><option value="">(type below)</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {f(cv, setCv, 'subject_label', 'or subject name', 'text', 160)}{f(cv, setCv, 'source_reference', 'Source (official syllabus reference)', 'text', 300)}{f(cv, setCv, 'notes', 'Notes', 'text', 200)}
        <button className="btn btn--accent btn--small" onClick={() => call({ action: 'curriculum_create', version: cv }, 'Version added as draft.')}>Add version</button>
        <table style={{ borderCollapse: 'collapse', marginTop: '0.6rem' }}><tbody>{versions.map((v) => (
          <tr key={v.id}><td style={td}>{v.board} {v.academic_year} class {v.class_level}</td><td style={td}>{v.subject_label ?? subjects.find((s) => s.id === v.subject_id)?.name ?? ''} ({v.language}) v{v.version}</td><td style={td}><strong>{v.status}</strong>{v.approved_by ? ` by ${v.approved_by}` : ''}</td><td style={td}>{v.source_reference ?? 'no source'}</td>
            <td style={td}>{({ draft: ['needs_review'], needs_review: ['approved', 'draft'], approved: ['published', 'needs_review'], published: ['retired'], retired: ['draft'] } as Record<string, string[]>)[v.status]?.map((to) => <button key={to} className="btn btn--ghost btn--small" onClick={() => call({ action: 'curriculum_move', id: v.id, to }, `Moved to ${to}.`)}>→ {to}</button>)}</td></tr>
        ))}{!versions.length && <tr><td style={td}>None yet.</td></tr>}</tbody></table>
      </div>

      <div style={box}>
        <h2>Country prices (testing)</h2>
        <p style={{ color: 'var(--slate)' }}>Prices for families outside India, typed by you (for example a test range of US$25 to 50 a month). They are NOT converted from rupees and are NOT yet used at checkout: international checkout is not built, so this is where you record and test the numbers. Terms and conditions apply to every price.</p>
        {f(pr, setPr, 'country', 'Country', 'text', 120)}{f(pr, setPr, 'currency', 'Currency', 'text', 70)}
        <label style={{ fontSize: '0.85rem', marginRight: '0.6rem' }}>Plan<br /><select className="field__input" value={pr.product_code} onChange={(e) => setPr({ ...pr, product_code: e.target.value })}>{products.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
        {f(pr, setPr, 'price', 'Price', 'number', 100)}{f(pr, setPr, 'tax_pct', 'Tax %', 'number', 70)}{f(pr, setPr, 'payment_method', 'Payment method', 'text', 130)}{f(pr, setPr, 'tier', 'Tier', 'text', 90)}{f(pr, setPr, 'promotion', 'Promotion', 'text', 130)}
        <label style={{ fontSize: '0.85rem' }}><input type="checkbox" checked={pr.active} onChange={(e) => setPr({ ...pr, active: e.target.checked })} /> active</label>{' '}
        <button className="btn btn--accent btn--small" onClick={() => call({ action: 'price_save', price: pr }, 'Saved.')}>Save price</button>
        <table style={{ borderCollapse: 'collapse', marginTop: '0.6rem' }}><tbody>{prices.map((p) => (
          <tr key={p.id}><td style={td}>{p.country}</td><td style={td}>{products.find((x) => x.code === p.product_code)?.name ?? p.product_code}</td><td style={td}>{p.currency} {Number(p.price).toLocaleString()} (+{p.tax_pct}% tax)</td><td style={td}>{p.active ? 'active' : 'off'}</td><td style={td}><button className="btn btn--ghost btn--small" onClick={() => confirm('Delete this price?') && call({ action: 'price_delete', id: p.id }, 'Deleted.')}>Delete</button></td></tr>
        ))}{!prices.length && <tr><td style={td}>None yet.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
