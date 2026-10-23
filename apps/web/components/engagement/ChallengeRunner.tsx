'use client';
import { AnswerInput, answerProblem } from '@/components/AnswerInput';
import { useEffect, useRef, useState } from 'react';
import { MathText } from '@/components/MathText';
import { QuestionFigure } from '@/components/QuestionFigure';
import { E, trE, type ELang } from '@adaptive-tutor/core';

type Q = { attemptId: string; index: number; total: number; mode: string; id: string; prompt: string; questionType: string; options: string[] | null; figureUrl: string | null; figureCaption: string | null; inputKind?: 'number' | 'text' | 'expression' | 'choice'; role: string };
type Summary = { mode: string; attempted: number; correct: number; accuracy: number | null; xp: { amount: number; breakdown: { label: string; xp: number }[]; capped: boolean }; best: { kind: string; message: string } | null; mistakesCorrected: number; conceptNote: string | null; nextAction: { text: string; href: string }; comeback: { original: { correct: number; total: number; percent: number }; now: { correct: number; total: number; percent: number }; corrected: number } | null; masteryNote: string };
const TITLE_KEY: Record<string, string> = { practice: 'mode.practice', challenge: 'mode.challenge', mixed: 'mode.mixedRound', boss: 'mode.boss', weakness: 'mode.weakness', mistake_review: 'mode.mistake_review', comeback: 'mode.comeback', daily: 'mode.daily', org: 'mode.org', friend: 'mode.friend' };

export function ChallengeRunner({ start, lang = 'en' }: { start: Record<string, string | undefined>; lang?: ELang }) {
  const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
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
      if (r.error) { setMsg(r.error === 'unauthenticated' ? L('run.signin') : trE(r.error, lang)); setPhase('error'); return; }
      if (r.data.completed) { setMsg(r.data.notice ? trE(r.data.notice, lang) : L('run.finished')); setPhase('finished_before'); return; }
      setNotice(r.data.notice); setQ(r.data.question); t0.current = Date.now(); setPhase('question');
    })();
  }, [start]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!q || busy || !input.trim()) return;
    if (q.questionType !== 'mcq') { const bad = answerProblem(q.inputKind, q.questionType, input, lang); if (bad) { setNotice(bad); return; } }
    setBusy(true);
    const seconds = Math.round((Date.now() - t0.current) / 1000);
    const r = await (await fetch('/api/engagement/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'answer', attemptId: q.attemptId, answer: input.trim(), seconds }) })).json();
    setBusy(false);
    if (r.error) { setMsg(r.error); setPhase('error'); return; }
    setFb(r.data); setPhase('feedback');
  }
  function next() { if (!fb) return; if (fb.summary) { setSummary(fb.summary); setPhase('done'); return; } setQ(fb.next); setInput(''); setFb(null); t0.current = Date.now(); setPhase('question'); }

  const title = L(TITLE_KEY[start.mode ?? ''] ?? 'mode.challenge');
  if (phase === 'loading') return <p>{L('run.loading')}</p>;
  if (phase === 'error') return <div><p className="alert">{msg}</p><p><a className="btn btn--ghost" href="/today">{L('run.back')}</a></p></div>;
  if (phase === 'finished_before') return <div><p>{msg}</p><p><a className="btn btn--accent" href="/today">{L('run.back')}</a></p></div>;
  if (phase === 'done' && summary) return <SummaryView s={summary} title={title} lang={lang} />;
  if (!q) return null;
  const pct = Math.round((q.index / Math.max(1, q.total)) * 100);
  return (
    <div>
      <p className="hero__eyebrow">{title} · {L('run.q', { a: q.index + 1, b: q.total })}{q.role === 'retry' ? L('run.retry') : q.role === 'similar' ? L('run.similar') : ''}</p>
      <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${pct}%` }} /></div>
      {notice && <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{trE(notice, lang)}</p>}
      <form onSubmit={submit}>
        <div className="question-card fade-slide-in">
          <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
          <p className="question-card__prompt"><MathText text={q.prompt} /></p>
          {q.questionType === 'mcq' && q.options ? (
            <div className="mcq-options">{q.options.map((o) => (<label key={o} className="mcq-option"><input type="radio" name="a" value={o} checked={input === o} disabled={phase === 'feedback'} onChange={() => setInput(o)} /><MathText text={o} /></label>))}</div>
          ) : (<AnswerInput value={input} disabled={phase === 'feedback'} onChange={setInput} placeholder={L('run.answer')} questionType={q.questionType} inputKind={q.inputKind} lang={lang} autoFocus />)}
        </div>
        {phase === 'question' && <button type="submit" className="btn btn--accent" disabled={busy || !input.trim()}>{busy ? L('run.checking') : L('run.check')}</button>}
      </form>
      {phase === 'feedback' && fb && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="alert" style={fb.correct ? { borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' } : undefined}>{fb.correct ? L('run.right') : <>{L('run.wrong')} <strong><MathText text={fb.correctAnswer} /></strong>.</>}</p>
          {!fb.correct && fb.explanation && <p><MathText text={fb.explanation} /></p>}
          <button className="btn btn--accent" onClick={next}>{fb.summary ? L('run.see') : L('run.nextQ')}</button>
        </div>
      )}
    </div>
  );
}

function SummaryView({ s, title, lang }: { s: Summary; title: string; lang: ELang }) {
  const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  return (
    <div className="fade-slide-in">
      <h2 style={{ fontSize: 'var(--step-2)' }}>{L('run.sumTitle')}</h2>
      <p className="hero__eyebrow">{title}</p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>✓ {L('run.attempted', { a: s.attempted, c: s.correct })}{s.accuracy !== null ? ` (${Math.round(s.accuracy)}%)` : ''}</li>
        {s.mistakesCorrected > 0 && <li>✓ {L('run.corrected', { n: s.mistakesCorrected })}</li>}
        {s.conceptNote && <li>✓ {trE(s.conceptNote, lang)}</li>}
        {s.xp.amount > 0 && <li>✓ {L('run.xp', { n: s.xp.amount })}{s.xp.breakdown.map((b) => `${trE(b.label, lang)} (+${b.xp})`).join(', ')}{s.xp.capped ? L('run.cap') : ''}</li>}
      </ul>
      {s.best && <p className="alert" style={s.best.kind === 'new_best' ? { borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' } : undefined}>{trE(s.best.message, lang)}</p>}
      {s.comeback && <p><strong>{L('run.comeback')}</strong> {L('run.comebackBody', { a: s.comeback.original.correct, b: s.comeback.original.total, p: s.comeback.original.percent, c: s.comeback.now.correct, d: s.comeback.now.total, q: s.comeback.now.percent, k: s.comeback.corrected })}</p>}
      <h3>{L('run.sumNext')}</h3>
      <p><a className="btn btn--accent" href={s.nextAction.href}>{trE(s.nextAction.text, lang)}</a> <a className="btn btn--ghost" href="/today">{L('run.back')}</a></p>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{trE(s.masteryNote, lang)}</p>
    </div>
  );
}
