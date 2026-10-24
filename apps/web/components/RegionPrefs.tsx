'use client';
import { useEffect, useState } from 'react';
import { COUNTRY_CURRENCY } from '@adaptive-tutor/core';

export function RegionPrefs() {
  const [country, setCountry] = useState('India');
  const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/me/region').then((r) => r.json()).then((j) => { if (j.data?.country) setCountry(j.data.country); }).catch(() => {}); }, []);
  async function save(c: string) {
    setCountry(c);
    let timezone = ''; try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }
    const r = await fetch('/api/me/region', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: c, timezone }) });
    setMsg(r.ok ? 'Saved.' : 'Could not save.'); setTimeout(() => setMsg(''), 2000);
  }
  return (
    <label style={{ display: 'block', margin: '0.6rem 0', fontSize: '0.9rem' }}>Country where you live (optional){' '}
      <select className="field__input" style={{ maxWidth: 260 }} value={country} onChange={(e) => save(e.target.value)}>{Object.keys(COUNTRY_CURRENCY).map((c) => <option key={c}>{c}</option>)}</select> <span role="status">{msg}</span>
    </label>
  );
}
