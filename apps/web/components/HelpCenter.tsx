'use client';
import { useState } from 'react';
import { HELP, HELP_CATEGORIES, searchHelp, type HelpAudience } from '@/lib/help-content';

const WHO: { id: HelpAudience | ''; label: string }[] = [{ id: '', label: 'Everyone' }, { id: 'student', label: 'Student' }, { id: 'parent', label: 'Parent' }, { id: 'teacher', label: 'Teacher' }, { id: 'tutor', label: 'Tutor' }, { id: 'centre', label: 'Coaching centre' }, { id: 'admin', label: 'Admin' }, { id: 'team', label: 'Admin team' }];
export function HelpCenter({ initialRole }: { initialRole?: string }) {
  const [q, setQ] = useState(''); const [who, setWho] = useState<string>(initialRole ?? '');
  const hits = searchHelp(q, who || null);
  return (
    <div>
      <div className="field"><label className="field__label" htmlFor="help-q">Search help</label><input id="help-q" type="search" className="field__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: invitation, link, password" /></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 16px' }} role="group" aria-label="Help for">{WHO.map((w) => <button key={w.id} type="button" className={'btn' + (who === w.id ? ' btn--accent' : '')} aria-pressed={who === w.id} onClick={() => setWho(w.id)}>{w.label}</button>)}</div>
      {hits.length === 0 && <p>No help article matches. Try other words, or use the feedback button to ask us.</p>}
      {HELP_CATEGORIES.map((c) => { const items = hits.filter((a) => a.category === c); if (!items.length) return null; return (
        <section key={c}><h2 style={{ fontSize: 'var(--step-1)' }}>{c}</h2>
          {items.map((a) => <details key={a.id} id={a.id} style={{ margin: '6px 0' }} open={!!q && items.length < 4}><summary><strong>{a.title}</strong></summary>{a.body.map((p, i) => <p key={i} style={{ maxWidth: '65ch' }}>{p}</p>)}</details>)}
        </section>); })}
      <p style={{ color: 'var(--slate)' }}>{HELP.length} articles. Can&apos;t find it? <a href="/contact">Contact us</a> or use the feedback button.</p>
    </div>
  );
}
