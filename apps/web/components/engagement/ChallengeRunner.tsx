'use client';
import { useEffect, useRef, useState } from 'react';
import { MathText } from '@/components/MathText';
import { QuestionFigure } from '@/components/QuestionFigure';

type Q = { attemptId: string; index: number; total: number; mode: string; id: string; prompt: string; questionType: string; options: string[] | null; figureUrl: string | null; figureCaption: string | null; role: string };
type Summary = { mode: string; attempted: number; correct: number; accuracy: number | null; xp: { amount: number; breakdown: { label: string; xp: number }[]; capped: boolean }; best: { kind: string; message: string } | null; mistakesCorrected: number; conceptNote: string | null; nextAction: { text: string; href: string }; comeback: { original: { correct: number; total: number; percent: number }; now: { correct: number; total: number; percent: number }; corrected: number } | null; masteryNote: string };
const TITLE: Record<string, string> = { practice: 'Practice', challenge: 'Challenge', mixed: 'Mixed round', boss: 'Boss Battle', weakness: 'Weakness Battle', mistake_review: 'Mistake review', comeback: 'Comeback Challenge', daily: 'CBSE Challenge of the Day', org: 'Challenge from your tutor' };

export function ChallengeRunner({ start }: { start: Record<string, string | undefined> }) {
  const [phase, setPhase] = useState<'loading' | 'question' | 'feedback' | 'done' | 'error' | 'finished_before'>('loading');
  const [q, setQ] = useState<Q | null>(null); const [msg, setMsg] = useState(''); const [notice, setNotice] = useState<string | null>(null);
  const [input, setInput] = useState(''); const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<{ correct: boolean; correctAnswer: string; explanation: string | null; next: Q | null; summary: Summary | null } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const t0 = useRef<number>(Date.now()); const began = useRef(false);

  useEffect(() => {
    if (began.current) return; began.current = true;
    (async () => {
      const r = await (await fetch('/api/engagement/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', ...start }) })).json();
      if (r.error) { setMsg(r.error === 'unauthenticated' ? 'Please sign in.' : r.error); setPhase('error'); return; }
      if (r.data.completed) { setMsg(r.data.notice ?? 'Already finished.'); setPhase('finished_before'); return; }
      setNotice(r.data.notice); setQ(r.data.question); t0.current = Date.now(); setPhase('question');
    })();
  }, [start]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!q || busy || !input.trim()) return; setBusy(true);
    const seconds = Math.round((Date.now() - t0.current) / 1000);
    const r = await (await fetch('/api/engagement/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'answer', attemptId: q.attemptId, answer: input.trim(), seconds }) })).json();
    setBusy(false);
    if (r.error) { setMsg(r.error); setPhase('error'); return; }
    setFb(r.data); setPhase('feedback');
  }
  function next() { if (!fb) return; if (fb.summary) { setSummary(fb.summary); setPhase('done'); return; } setQ(fb.next); setInput(''); setFb(null); t0.current = Date.now(); setPhase('question'); }

  const title = TITLE[start.mode ?? ''] ?? 'Challenge';
  if (phase === 'loading') return <p>Getting your questions ready…</p>;
  if (phase === 'error') return <div><p className="alert">{msg}</p><p><a className="btn btn--ghost" href="/today">Back to Today</a></p></div>;
  if (phase === 'finished_before') return <div><p>{msg}</p><p><a className="btn btn--accent" href="/today">Back to Today</a></p></div>;
  if (phase === 'done' && summary) return <SummaryView s={summary} title={title} />;
  if (!q) return null;
  const pct = Math.round((q.index / Math.max(1, q.total)) * 100);
  return (
    <div>
      <p className="hero__eyebrow">{title} · Question {q.index + 1} of {q.total}{q.role === 'retry' ? ' · Try it again' : q.role === 'similar' ? ' · A similar one' : ''}</p>
      <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${pct}%` }} /></div>
      {notice && <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{notice}</p>}
      <form onSubmit={submit}>
        <div className="question-card fade-slide-in">
          <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
          <p className="question-card__prompt"><MathText text={q.prompt} /></p>
          {q.questionType === 'mcq' && q.options ? (
            <div className="mcq-options">{q.options.map((o) => (<label key={o} className="mcq-option"><input type="radio" name="a" value={o} checked={input === o} disabled={phase === 'feedback'} onChange={() => setInput(o)} /><MathText text={o} /></label>))}</div>
          ) : (<input className="field__input" value={input} disabled={phase === 'feedback'} onChange={(e) => setInput(e.target.value)} placeholder="Your answer" autoFocus />)}
        </div>
        {phase === 'question' && <button type="submit" className="btn btn--accent" disabled={busy || !input.trim()}>{busy ? 'Checking…' : 'Check answer'}</button>}
      </form>
      {phase === 'feedback' && fb && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="alert" style={fb.correct ? { borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' } : undefined}>{fb.correct ? 'Correct.' : <>Not this time. The answer is <strong><MathText text={fb.correctAnswer} /></strong>.</>}</p>
          {!fb.correct && fb.explanation && <p><MathText text={fb.explanation} /></p>}
          <button className="btn btn--accent" onClick={next}>{fb.summary ? 'See what you achieved' : 'Next question'}</button>
        </div>
      )}
    </div>
  );
}

function SummaryView({ s, title }: { s: Summary; title: string }) {
  return (
    <div className="fade-slide-in">
      <h2 style={{ fontSize: 'var(--step-2)' }}>WHAT YOU ACHIEVED</h2>
      <p className="hero__eyebrow">{title}</p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>✓ {s.attempted} question{s.attempted === 1 ? '' : 's'} attempted, {s.correct} correct{s.accuracy !== null ? ` (${Math.round(s.accuracy)}%)` : ''}</li>
        {s.mistakesCorrected > 0 && <li>✓ {s.mistakesCorrected} mistake{s.mistakesCorrected === 1 ? '' : 's'} corrected</li>}
        {s.conceptNote && <li>✓ {s.conceptNote}</li>}
        {s.xp.amount > 0 && <li>✓ {s.xp.amount} XP: {s.xp.breakdown.map((b) => `${b.label} (+${b.xp})`).join(', ')}{s.xp.capped ? ' · daily XP limit reached' : ''}</li>}
      </ul>
      {s.best && <p className="alert" style={s.best.kind === 'new_best' ? { borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' } : undefined}>{s.best.message}</p>}
      {s.comeback && <p><strong>Comeback:</strong> Original round {s.comeback.original.correct} of {s.comeback.original.total} ({s.comeback.original.percent}%). Fixing those mistakes: {s.comeback.now.correct} of {s.comeback.now.total} right ({s.comeback.now.percent}%). {s.comeback.corrected} mistake{s.comeback.corrected === 1 ? '' : 's'} corrected.</p>}
      <h3>YOUR NEXT STEP</h3>
      <p><a className="btn btn--accent" href={s.nextAction.href}>{s.nextAction.text}</a> <a className="btn btn--ghost" href="/today">Back to Today</a></p>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{s.masteryNote}</p>
    </div>
  );
}
