'use client';
import { useState } from 'react';

interface Props { userId: string; email: string; phone: string | null; whatsapp: string | null; note: string | null }

export default function ContactRowEditor(p: Props) {
  const [v, setV] = useState({ email: p.email, phone: p.phone ?? '', whatsapp: p.whatsapp ?? '', note: p.note ?? '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const cell = { padding: 4 } as const;
  async function save() {
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/admin/contacts', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: p.userId, ...v }) });
      const j = await res.json().catch(() => ({}));
      setMsg(res.ok ? 'Saved' : (j.message ?? 'Could not save'));
    } catch { setMsg('Could not save'); }
    setBusy(false);
  }
  return (
    <>
      <td style={cell}><input aria-label="Email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} style={{ width: 210 }} /></td>
      <td style={cell}><input aria-label="Phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} style={{ width: 130 }} /></td>
      <td style={cell}><input aria-label="WhatsApp" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} style={{ width: 130 }} /></td>
      <td style={cell}><input aria-label="Note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} style={{ width: 150 }} /></td>
      <td style={cell}><button type="button" onClick={save} disabled={busy}>Save</button> <span role="status">{msg}</span></td>
    </>
  );
}
