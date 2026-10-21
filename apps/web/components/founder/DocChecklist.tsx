'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function DocChecklist({ docs }: { docs: { key: string; label: string; status: string; notes: string | null }[] }) {
  const router = useRouter(); const [busy, setBusy] = useState('');
  async function set(key: string, status: string, notes?: string) { setBusy(key); await fetch('/api/admin/founder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'doc_status', key, status, notes }) }); setBusy(''); router.refresh(); }
  const color: Record<string, string> = { complete: '#1f9d55', needs_update: '#e0a100', missing: '#d03a2f' };
  return (<div>{docs.map((d) => (
    <div key={d.key} className="chapter-row" style={{ display: 'block', marginTop: '0.4rem' }}>
      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: color[d.status], marginRight: 8 }} /><strong>{d.label}</strong>
      <select value={d.status} disabled={busy === d.key} onChange={(e) => set(d.key, e.target.value, d.notes ?? undefined)} style={{ marginLeft: 10 }}><option value="missing">MISSING</option><option value="needs_update">NEEDS UPDATE</option><option value="complete">COMPLETE</option></select>
      <input defaultValue={d.notes ?? ''} placeholder="Where it is / what is left" onBlur={(e) => { if (e.target.value !== (d.notes ?? '')) set(d.key, d.status, e.target.value); }} style={{ marginLeft: 10, minWidth: 200 }} />
    </div>))}</div>);
}
