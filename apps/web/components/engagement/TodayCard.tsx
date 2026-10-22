'use client';
import { useEffect, useState } from 'react';
type S = { streak: { current: number; message: string } | null; xp: number | null; mission: { title: string; status: string; items: { label: string; progress: number; target: number; done: boolean; href: string | null }[] } | null; newly: string[] };
export function TodayCard() {
  const [s, setS] = useState<S | null>(null);
  const h = new Date().getHours(); const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  useEffect(() => { fetch('/api/engagement/summary').then((r) => r.json()).then((r) => setS(r.data)).catch(() => undefined); }, []);
  const m = s?.mission; const done = m ? m.items.filter((i) => i.done).length : 0;
  return (
    <section className="tip-card fade-slide-in" style={{ marginTop: 'var(--space-3)' }}>
      <span className="tip-card__eyebrow">{greet} · Today&apos;s Mission{m ? ` · ${m.title}` : ''}</span>
      {m ? (<>
        <p className="tip-card__body"><strong>Progress: {done}/{m.items.length}</strong>{s?.streak ? ` · ${s.streak.message}` : ''}{s?.xp != null ? ` · ${s.xp} XP` : ''}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{m.items.map((i, k) => <li key={k}>{i.done ? '☑' : '☐'} {i.href && !i.done ? <a href={i.href}>{i.label}</a> : i.label}</li>)}</ul>
        <p style={{ margin: '0.5rem 0 0' }}><a href="/today">Open Today</a></p>
      </>) : <p className="tip-card__body">{s ? 'Open Today to see your next step.' : 'Getting your mission ready…'} <a href="/today">Open Today</a></p>}
    </section>
  );
}
