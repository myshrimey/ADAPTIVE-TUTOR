'use client';

import { useCallback, useEffect, useState } from 'react';

const ROLE_LABEL: Record<string, string> = { parent: 'Parent', tutor: 'Tutor', centre: 'Coaching centre' };
interface Data { links: { id: string; type: string; name: string; since: string }[]; openCodes: { id: string; forRole: string; expiresAt: string }[] }

export function SharingClient() {
  const [data, setData] = useState<Data | null>(null);
  const [fresh, setFresh] = useState<{ code: string; role: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch('/api/student/sharing');
    const j = await r.json();
    if (j.data) setData(j.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function make(forRole: string) {
    setMsg(null);
    const r = await fetch('/api/student/sharing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ forRole }) });
    const j = await r.json();
    if (j.error) return setMsg(j.error === 'too_many_codes' ? 'You already have 3 unused codes. Cancel one first.' : 'Could not make a code. Please try again.');
    setFresh({ code: j.data.code, role: forRole });
    load();
  }
  async function del(body: object, ask?: string) {
    if (ask && !window.confirm(ask)) return;
    await fetch('/api/student/sharing', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  }

  return (
    <div>
      <section className="chapter-row" style={{ display: 'block' }}>
        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>Make a code</h2>
        <p style={{ marginTop: 0, color: 'var(--slate)' }}>Pick who the code is for. Give it to them yourself. It works once and expires in 7 days.</p>
        <div className="hero__actions">
          {Object.entries(ROLE_LABEL).map(([k, v]) => <button key={k} className="btn btn--ghost btn--small" onClick={() => make(k)}>Code for a {v.toLowerCase()}</button>)}
        </div>
        {msg && <p className="alert">{msg}</p>}
        {fresh && <p className="alert" style={{ fontFamily: 'monospace', fontSize: '1.3rem' }}>{fresh.code}<span style={{ fontFamily: 'inherit', fontSize: '0.85rem', display: 'block' }}>For a {ROLE_LABEL[fresh.role].toLowerCase()}. Copy it now: it is shown only once.</span></p>}
      </section>

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Following me now</h2>
      {data && data.links.length === 0 && <p style={{ color: 'var(--slate)' }}>No one yet.</p>}
      {data?.links.map((l) => (
        <div key={l.id} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
          <strong>{l.name}</strong> <span style={{ color: 'var(--slate)' }}>({ROLE_LABEL[l.type]}) since {new Date(l.since).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
          <div style={{ marginTop: '0.3rem' }}><button className="btn btn--ghost btn--small" onClick={() => del({ linkId: l.id }, `Stop ${l.name} from seeing your progress?`)}>Stop sharing</button></div>
        </div>
      ))}

      {data && data.openCodes.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Unused codes</h2>
          {data.openCodes.map((c) => (
            <div key={c.id} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
              For a {ROLE_LABEL[c.forRole].toLowerCase()} · expires {new Date(c.expiresAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
              <button className="btn btn--ghost btn--small" onClick={() => del({ codeId: c.id })}>Cancel code</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
