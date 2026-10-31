'use client';
import { useMemo, useState } from 'react';
import { NODE_LABEL, NODE_KINDS } from '@adaptive-tutor/core/curriculum-mgmt/constants';

interface N { id: string; parent_id: string | null; kind: string; name: string; sequence: number; source_page: number | null; confidence: number | null; flagged: boolean; flag_note: string | null; linked_table: string | null }
async function call(body: any) { return fetch('/api/admin/curriculum', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({ error: 'Could not reach the server.' })); }

export function ReviewBoard({ versionId, status, nodes, superAdmin, canRollback }: { versionId: string; status: string; nodes: N[]; superAdmin: boolean; canRollback: boolean }) {
  const editable = ['draft', 'uploaded', 'needs_review', 'failed'].includes(status);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [paste, setPaste] = useState(''); const [fmt, setFmt] = useState<'outline' | 'csv'>('outline');
  const [add, setAdd] = useState({ kind: 'chapter', name: '', parentId: '', page: '' }); const [sugg, setSugg] = useState<any[] | null>(null);
  const kids = useMemo(() => { const m = new Map<string, N[]>(); for (const n of nodes) { const k = n.parent_id ?? 'root'; (m.get(k) ?? m.set(k, []).get(k)!).push(n); } return m; }, [nodes]);
  async function act(body: any, reload = true) { setBusy(true); setMsg(''); const r = await call(body); setBusy(false); if (r.error) { setMsg(String(r.error)); return r; } if (reload) location.reload(); return r; }
  const Row = ({ n, depth }: { n: N; depth: number }) => (
    <li style={{ marginLeft: depth ? 16 : 0, listStyle: 'none', borderLeft: depth ? '2px solid var(--line, #ddd)' : 0, paddingLeft: depth ? 8 : 0 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '2px 0' }}>
        <small style={{ color: 'var(--slate)', minWidth: 90 }}>{NODE_LABEL[n.kind as keyof typeof NODE_LABEL]}</small>
        {editable ? <input aria-label="Name" defaultValue={n.name} style={{ flex: 1, minWidth: 180 }} className="field__input" onBlur={(e) => e.target.value !== n.name && act({ action: 'edit', nodeId: n.id, name: e.target.value })} /> : <span style={{ flex: 1 }}>{n.name}</span>}
        <small>p.{editable ? <input aria-label="Source page" defaultValue={n.source_page ?? ''} style={{ width: 50 }} onBlur={(e) => String(n.source_page ?? '') !== e.target.value && act({ action: 'edit', nodeId: n.id, source_page: e.target.value })} /> : n.source_page ?? '—'}</small>
        {n.confidence !== null && n.confidence < 1 && <small title="Read automatically; a person has not confirmed it">auto {Math.round(n.confidence * 100)}%</small>}
        {n.linked_table && <small>linked: {n.linked_table}</small>}
        {n.flagged && <strong title={n.flag_note ?? ''}>⚠ uncertain</strong>}
        {editable && <><button className="btn" disabled={busy} onClick={() => act({ action: 'edit', nodeId: n.id, flagged: !n.flagged, flag_note: n.flagged ? null : 'Check against the source' })}>{n.flagged ? 'Clear flag' : 'Flag'}</button><button className="btn" disabled={busy} onClick={() => confirm('Delete this item and everything under it?') && act({ action: 'delete', nodeId: n.id })}>Delete</button></>}
      </div>
      {(kids.get(n.id) ?? []).length > 0 && <ul style={{ margin: 0, padding: 0 }}>{kids.get(n.id)!.map((c) => <Row key={c.id} n={c} depth={depth + 1} />)}</ul>}
    </li>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {status === 'needs_review' && superAdmin && <button className="btn btn--accent" disabled={busy} onClick={() => act({ action: 'approve', id: versionId })}>Approve</button>}
        {status === 'approved' && superAdmin && <><button className="btn btn--accent" disabled={busy} onClick={() => confirm('Publish this version? The version it replaces is kept as "Superseded" and can be restored.') && act({ action: 'publish', id: versionId })}>Publish</button><button className="btn" disabled={busy} onClick={() => act({ action: 'unapprove', id: versionId })}>Send back to review</button></>}
        {status === 'superseded' && superAdmin && canRollback && <button className="btn btn--accent" disabled={busy} onClick={() => confirm('Restore this earlier version as the published one?') && act({ action: 'rollback', id: versionId })}>Roll back to this version</button>}
        {!superAdmin && ['needs_review', 'approved', 'superseded'].includes(status) && <small style={{ color: 'var(--slate)' }}>Only the founder can approve, publish or roll back.</small>}
      </div>
      {msg && <p className="alert" role="alert">{msg}</p>}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Outline</h2>
      {!editable && <p style={{ color: 'var(--slate)' }}>This version is frozen so its history cannot change. To change it, upload a new version.</p>}
      <ul style={{ margin: 0, padding: 0 }}>{(kids.get('root') ?? []).map((n) => <Row key={n.id} n={n} depth={0} />)}</ul>
      {nodes.length === 0 && <p>No items yet.</p>}
      {editable && (<>
        <form className="chapter-row" style={{ display: 'block', marginTop: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: 'add', id: versionId, ...add }); }}>
          <h3 style={{ marginTop: 0 }}>Add an item</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select aria-label="Kind" className="field__input" style={{ width: 'auto' }} value={add.kind} onChange={(e) => setAdd({ ...add, kind: e.target.value })}>{NODE_KINDS.map((k) => <option key={k} value={k}>{NODE_LABEL[k]}</option>)}</select>
            <select aria-label="Under" className="field__input" style={{ width: 'auto' }} value={add.parentId} onChange={(e) => setAdd({ ...add, parentId: e.target.value })}><option value="">(top level)</option>{nodes.filter((n) => n.kind !== 'learning_outcome').map((n) => <option key={n.id} value={n.id}>{NODE_LABEL[n.kind as keyof typeof NODE_LABEL]}: {n.name.slice(0, 40)}</option>)}</select>
            <input aria-label="Name" className="field__input" style={{ flex: 1, minWidth: 200 }} placeholder="Name exactly as in the source" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} required />
            <input aria-label="Page" className="field__input" style={{ width: 80 }} placeholder="Page" value={add.page} onChange={(e) => setAdd({ ...add, page: e.target.value })} />
            <button className="btn" disabled={busy}>Add</button>
          </div>
        </form>
        <details style={{ marginTop: 16 }}><summary><strong>Paste an outline or CSV (replaces the outline)</strong></summary>
          <p style={{ color: 'var(--slate)' }}>Outline text: one item per line starting with <code>Unit:</code>, <code>Chapter:</code>, <code>Topic:</code>, <code>LO:</code> or <code>AO:</code>; add the page as <code>[p.12]</code> at the end. Lines that do not start with one of these are left out and counted, never guessed.</p>
          <select aria-label="Format" className="field__input" style={{ width: 'auto' }} value={fmt} onChange={(e) => setFmt(e.target.value as any)}><option value="outline">Outline text</option><option value="csv">CSV rows</option></select>
          <textarea aria-label="Pasted outline" className="field__input" rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Unit: ...\nChapter: ... [p.4]\nTopic: ...'} />
          <button className="btn" disabled={busy || !paste.trim()} onClick={() => confirm('Replace the whole outline with this text?') && act({ action: 'outline', id: versionId, text: paste, format: fmt })}>Replace outline</button>
        </details>
        <div style={{ marginTop: 16 }}><button className="btn" disabled={busy} onClick={async () => { const r = await act({ action: 'suggest', id: versionId }, false); setSugg(r.data?.suggestions ?? []); }}>Find matching learning content</button>
          {sugg && <div><p>{sugg.length ? 'These items have the same name as existing learning content. Link only if they really are the same.' : 'No identical names were found.'}</p>{sugg.map((s: any) => <p key={s.nodeId}>{s.name} ({s.table}) <button className="btn" disabled={busy} onClick={() => act({ action: 'link', nodeId: s.nodeId, table: s.table, linkId: s.id })}>Link</button></p>)}</div>}</div>
      </>)}
    </div>
  );
}
