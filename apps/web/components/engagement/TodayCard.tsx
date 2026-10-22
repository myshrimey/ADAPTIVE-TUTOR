'use client';
import { useEffect, useState } from 'react';
import { E, trE, type ELang } from '@adaptive-tutor/core';
type S = { streak: { current: number; message: string } | null; xp: number | null; mission: { title: string; status: string; items: { label: string; progress: number; target: number; done: boolean; href: string | null }[] } | null; newly: string[] };
export function TodayCard({ lang = 'en' }: { lang?: ELang }) {
  const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  const [s, setS] = useState<S | null>(null);
  const h = new Date().getHours(); const greet = L(h < 12 ? 'greet.morning' : h < 17 ? 'greet.afternoon' : 'greet.evening');
  useEffect(() => { fetch('/api/engagement/summary').then((r) => r.json()).then((r) => setS(r.data)).catch(() => undefined); }, []);
  const m = s?.mission; const done = m ? m.items.filter((i) => i.done).length : 0;
  return (
    <section className="tip-card fade-slide-in" style={{ marginTop: 'var(--space-3)' }}>
      <span className="tip-card__eyebrow">{greet} · {L('card.mission')}{m ? ` · ${trE(m.title, lang)}` : ''}</span>
      {m ? (<>
        <p className="tip-card__body"><strong>{L('today.progress', { a: done, b: m.items.length })}</strong>{s?.streak ? ` · ${trE(s.streak.message, lang)}` : ''}{s?.xp != null ? ` · ${s.xp} XP` : ''}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{m.items.map((i, k) => <li key={k}>{i.done ? '☑' : '☐'} {i.href && !i.done ? <a href={i.href}>{trE(i.label, lang)}</a> : trE(i.label, lang)}</li>)}</ul>
        <p style={{ margin: '0.5rem 0 0' }}><a href="/today">{L('card.open')}</a></p>
      </>) : <p className="tip-card__body">{s ? L('card.next') : L('card.getting')} <a href="/today">{L('card.open')}</a></p>}
    </section>
  );
}
