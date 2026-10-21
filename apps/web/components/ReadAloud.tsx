'use client';
import { useState } from 'react';

// "Voice" for the free plan: the browser reads the tutor's message aloud. Free, no AI cost, so it is only counted against the daily limit.
// Hindi voices depend on the device; if none is installed the button says so instead of failing silently.
export function ReadAloud({ text, lang = 'en' }: { text: string; lang?: 'en' | 'hi' }) {
  const [msg, setMsg] = useState('');
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!supported) return null;
  async function go() {
    setMsg('');
    const r = await fetch('/api/feature/use', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'voice' }) }).then((x) => x.json()).catch(() => null);
    if (r?.data && r.data.allowed === false) { setMsg(`Today's free read-aloud limit (${r.data.limit}) is used. It resets tomorrow.`); return; }
    const clean = text.replace(/\$\$?[^$]*\$\$?/g, ' (formula) ').replace(/[*_`#>]/g, '').slice(0, 1200);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    if (lang === 'hi' && !window.speechSynthesis.getVoices().some((v) => v.lang.startsWith('hi'))) { setMsg('This device has no Hindi voice installed.'); return; }
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  }
  return <span className="no-print"><button type="button" className="btn btn--ghost btn--small" onClick={go} aria-label="Read this aloud">🔊 Read aloud</button>{msg && <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}>{msg}</span>}</span>;
}
