'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ERR: Record<string, string> = { not_authorized: 'Please sign in as the main admin.', tables_missing: 'The control tables are not set up yet. Run npm run db:migrate first.', not_found: 'That item was not found. Press "Load from documents" first.', task_already_finished: 'That task is already finished.', failed: 'Something went wrong. Nothing was changed.', network: 'No connection. Nothing was changed.' };

async function post(body: any): Promise<{ ok: boolean; msg: string }> {
  const r = await fetch('/api/admin/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({ error: 'network' }));
  return r?.error ? { ok: false, msg: ERR[r.error] ?? 'Not saved.' } : { ok: true, msg: r?.data?.message ?? 'Saved.' };
}
function useAct() {
  const router = useRouter(); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (body: any) => { setBusy(true); setMsg(''); const r = await post(body); setBusy(false); setMsg(r.msg); if (r.ok) router.refresh(); };
  return { msg, busy, run };
}

export function ImportButton() {
  const { msg, busy, run } = useAct();
  return (<span><button className="btn" disabled={busy} onClick={() => { if (confirm('Copy the documents\' registry into the database? Your own choices (priority, next task, acceptance) are not touched.')) run({ action: 'import' }); }}>{busy ? 'Loading…' : 'Load from documents'}</button> {msg && <span role="status" style={{ fontSize: '0.85rem' }}>{msg}</span>}</span>);
}
export function NextTaskButton({ taskId, isNext }: { taskId: string; isNext: boolean }) {
  const { msg, busy, run } = useAct();
  return (<span><button disabled={busy} onClick={() => run({ action: 'next', taskId: isNext ? null : taskId })} title="Only records your choice. Nothing is started.">{isNext ? 'Clear "next"' : 'Mark as next'}</button>{msg && <span role="status" style={{ fontSize: '0.78rem', marginLeft: 6 }}>{msg}</span>}</span>);
}
export function PrioritySelect({ promptId, value }: { promptId: string; value: string | null }) {
  const { msg, busy, run } = useAct();
  return (<span><select aria-label={`Priority for ${promptId}`} disabled={busy} value={value ?? ''} onChange={(e) => run({ action: 'priority', promptId, priority: e.target.value || null })}><option value="">not set</option><option value="now">now</option><option value="next">next</option><option value="later">later</option><option value="hold">on hold</option></select>{msg && <span role="status" style={{ fontSize: '0.78rem', marginLeft: 6 }}>{msg}</span>}</span>);
}
export function AcceptSelect({ promptId, code, value }: { promptId: string; code: string; value: string }) {
  const { msg, busy, run } = useAct();
  return (<span><select aria-label={`Your acceptance of ${code}`} disabled={busy} value={value} onChange={(e) => run({ action: 'accept', promptId, code, value: e.target.value })}><option value="pending">not yet</option><option value="accepted">accepted</option><option value="rejected">not accepted</option></select>{msg && <span role="status" style={{ fontSize: '0.78rem', marginLeft: 6 }}>{msg}</span>}</span>);
}

const QA_ERR: Record<string, string> = { not_authorized: 'Please sign in as the main admin.', tables_missing: 'Run npm run db:migrate first (adds the 0059 table).', note_has_contact_details: 'Please remove the email or phone number from the note.', note_too_long: 'The note is too long (500 letters at most).', unknown_item: 'That checklist item is not known.' };
/** Record one manual test result for a checklist item. Only records; changes no status. */
export function QaRecorder({ itemId, appVersion }: { itemId: string; appVersion: string }) {
  const router = useRouter(); const [note, setNote] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const send = async (result: 'pass' | 'fail' | 'blocked') => {
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/control/qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId, result, note, appVersion }) }).then((x) => x.json()).catch(() => ({ error: 'network' }));
    setBusy(false);
    if (r?.error) { setMsg(QA_ERR[r.error] ?? 'Not saved.'); return; }
    setNote(''); setMsg('Saved.'); router.refresh();
  };
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <input aria-label={`Note for ${itemId}`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="short note (optional, no names or phone numbers)" style={{ width: 210 }} />
      <button disabled={busy} onClick={() => send('pass')} title="It worked">Worked</button>
      <button disabled={busy} onClick={() => send('fail')} title="It did not work">Did not work</button>
      <button disabled={busy} onClick={() => send('blocked')} title="I could not try it (for example no test account)">Could not try</button>
      {msg ? <span role="status" style={{ fontSize: '0.8rem' }}>{msg}</span> : null}
    </span>
  );
}
