'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type FieldDef = { key: string; label: string; type: 'text' | 'textarea' | 'int' | 'date' | 'bool' | 'select'; options?: [string, string][]; unknown?: boolean; wide?: boolean };
export type Row = Record<string, any> & { id: string };
export interface Activity { record_id: string; kind: string; note: string; created_at: string; by_email: string | null }

const ERR: Record<string, string> = { name_required: 'Please enter a name.', title_required: 'Please enter a title.', amount_inr_required: 'Please enter the amount.', not_authorized: 'Please sign in as admin again.' };
const UNKNOWN = 'UNKNOWN — VERIFY';

// One screen-builder for every founder list (customers, schools, investors, expenses, tasks ...). It only sends the fields it was given;
// the server checks and limits every value again.
export function RecordManager({ what, title, rows, fields, listKeys, nameKey = 'name', stages, stageKey = 'stage', activities = [], logNotes = false, fitCriteria, fitWeights, scores = {}, kindFilter, initialKind, addLabel = 'Add new', defaults = {}, note }: {
  what: string; title: string; rows: Row[]; fields: FieldDef[]; listKeys: string[]; nameKey?: string; stages?: [string, string][]; stageKey?: string; activities?: Activity[]; logNotes?: boolean;
  fitCriteria?: [string, string][]; fitWeights?: Record<string, number>; scores?: Record<string, { score: number | null; rated: number; of: number }>; kindFilter?: [string, string][]; initialKind?: string; addLabel?: string; defaults?: Record<string, any>; note?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [fit, setFit] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState(initialKind ?? '');
  const [q, setQ] = useState('');
  const stageLabel = useMemo(() => new Map(stages ?? []), [stages]);

  async function call(body: any) {
    const r = await fetch('/api/admin/founder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({ error: 'network' }));
    return r;
  }
  function startNew() { setEditing(null); setVals({ ...defaults, ...(kind ? { kind } : {}) }); setFit({}); setOpen(true); setMsg(''); }
  function startEdit(r: Row) { setEditing(r.id); const v: Record<string, any> = {}; for (const f of fields) v[f.key] = r[f.key] ?? ''; setVals(v); setFit(r.fit ?? {}); setOpen(true); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    const values: Record<string, any> = { ...vals };
    if (fitCriteria) values.fit = fit;
    const r = await call({ action: 'save', what, id: editing, values });
    setBusy(false);
    if (r.error) { setMsg(ERR[r.error] ?? `Not saved: ${String(r.error).replace(/_/g, ' ')}`); return; }
    setOpen(false); router.refresh();
  }
  async function quick(id: string, patch: Record<string, any>) { await call({ action: 'save', what, id, values: patch }); router.refresh(); }
  async function del(id: string) { if (!window.confirm('Delete this record? This cannot be undone.')) return; await call({ action: 'delete', what, id }); router.refresh(); }
  async function log(id: string) {
    const note = window.prompt('What happened? (a call, a message, a meeting, a decision)'); if (!note) return;
    await call({ action: 'activity', table: what === 'funding' ? 'funding' : 'crm', recordId: id, note }); router.refresh();
  }

  const shown = rows.filter((r) => (!kind || r.kind === kind) && (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())));
  const labelOf = (f?: FieldDef, v?: any) => (f?.type === 'select' ? f.options?.find((o) => o[0] === v)?.[1] ?? v : v);
  return (
    <div>
      <div className="hero__actions" style={{ marginBottom: '0.6rem' }}>
        <button className="btn btn--accent btn--small" onClick={startNew}>{addLabel}</button>
        {kindFilter && <select value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All types</option>{kindFilter.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
        <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 180 }} />
      </div>
      {note && <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>{note}</p>}
      {open && (
        <form onSubmit={save} className="chapter-row" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
          <strong>{editing ? 'Edit' : addLabel}: {title}</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
            {fields.map((f) => (
              <div key={f.key} className="field" style={f.wide || f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
                <label className="field__label" htmlFor={`f_${f.key}`}>{f.label}</label>
                {f.type === 'textarea' ? <textarea id={`f_${f.key}`} className="field__input" rows={3} value={vals[f.key] ?? ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                  : f.type === 'select' ? <select id={`f_${f.key}`} className="field__input" value={vals[f.key] ?? ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}><option value="">{f.unknown ? UNKNOWN : '—'}</option>{f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  : f.type === 'bool' ? <select id={`f_${f.key}`} className="field__input" value={vals[f.key] === true || vals[f.key] === 'true' ? 'true' : vals[f.key] === false || vals[f.key] === 'false' ? 'false' : ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value === '' ? null : e.target.value === 'true' })}><option value="">{UNKNOWN}</option><option value="true">Yes</option><option value="false">No</option></select>
                  : <input id={`f_${f.key}`} className="field__input" type={f.type === 'int' ? 'number' : f.type === 'date' ? 'date' : 'text'} min={f.type === 'int' ? 0 : undefined} value={vals[f.key] ?? ''} placeholder={f.unknown ? UNKNOWN : ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />}
              </div>
            ))}
          </div>
          {fitCriteria && (
            <div style={{ marginTop: '0.6rem' }}>
              <strong>Internal Sahayak Fit Score: your ratings (0 = poor fit, 5 = strong fit; leave blank if you do not know)</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.4rem' }}>
                {fitCriteria.map(([k, l]) => (
                  <label key={k} style={{ fontSize: '0.88rem' }}>{l}{fitWeights && fitWeights[k] === 0 ? ' (ignored)' : ''}<br />
                    <input type="number" min={0} max={5} value={fit[k] ?? ''} onChange={(e) => { const n = { ...fit }; if (e.target.value === '') delete n[k]; else n[k] = Math.min(5, Math.max(0, Number(e.target.value))); setFit(n); }} style={{ width: 70 }} />
                  </label>
                ))}
              </div>
              <p style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>This is your own judgement, not an objective truth.</p>
            </div>
          )}
          <div className="hero__actions" style={{ marginTop: '0.6rem' }}>
            <button className="btn btn--accent btn--small" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {msg && <p className="alert">{msg}</p>}
        </form>
      )}
      {shown.length === 0 && <p style={{ color: 'var(--slate)' }}>Nothing here yet.</p>}
      {shown.map((r) => {
        const acts = activities.filter((a) => a.record_id === r.id).slice(0, 3);
        const sc = scores[r.id];
        return (
          <div key={r.id} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
            <strong>{r[nameKey]}</strong>
            {r.kind && kindFilter && <span style={{ color: 'var(--slate)' }}> · {kindFilter.find((k) => k[0] === r.kind)?.[1] ?? r.kind}</span>}
            {sc && <span style={{ marginLeft: '0.5rem' }} title="Internal Sahayak Fit Score: your own ratings, not an objective truth">· Fit {sc.score === null ? 'not rated' : `${sc.score}/100 (${sc.rated}/${sc.of} rated)`}</span>}
            <div style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>
              {listKeys.map((k) => { const f = fields.find((x) => x.key === k); const v = r[k]; const text = v === null || v === undefined || v === '' ? (f?.unknown ? UNKNOWN : '') : String(labelOf(f, v)); return text ? <span key={k} style={{ marginRight: '0.8rem' }}>{f?.label ?? k}: {text}</span> : null; })}
            </div>
            {stages && <div style={{ marginTop: '0.3rem' }}>Stage: <select value={r[stageKey] ?? ''} onChange={(e) => quick(r.id, { [stageKey]: e.target.value })}>{stages.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>{r.next_followup && <span style={{ marginLeft: '0.6rem', fontSize: '0.88rem' }}>Follow up: {r.next_followup}</span>}</div>}
            {acts.length > 0 && <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.1rem', fontSize: '0.84rem', color: 'var(--slate)' }}>{acts.map((a, i) => <li key={i}>{new Date(a.created_at).toLocaleDateString('en-IN')}: {a.note}</li>)}</ul>}
            <div className="hero__actions" style={{ marginTop: '0.4rem' }}>
              <button className="btn btn--ghost btn--small" onClick={() => startEdit(r)}>Edit</button>
              {logNotes && <button className="btn btn--ghost btn--small" onClick={() => log(r.id)}>Log a conversation</button>}
              {what === 'task' && r.status === 'open' && <button className="btn btn--ghost btn--small" onClick={() => quick(r.id, { status: 'done' })}>Mark done</button>}
              <button className="btn btn--ghost btn--small" onClick={() => del(r.id)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
