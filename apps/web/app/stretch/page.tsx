'use client';
// v63: Challenge zone. Harder, olympiad / competitive-exam-style questions for topics the student has already shown strong command of.
// Practice and motivation only: answers here never change mastery, readiness or any mark; badges carry no XP, money or discount.
import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';
import { AnswerInput, answerProblem } from '@/components/AnswerInput';
import { QuestionFigure } from '@/components/QuestionFigure';
import { accessErrorMessage } from '@/lib/access-errors';

interface Skill { skillId: string; skillName: string; subjectId: string; subjectName: string; level: number; solved: number; attempted: number }
interface Badge { code: string; title: string; description: string; unlocked: boolean }
interface Overview { skills: Skill[]; badges: Badge[]; attempted: number; metrics: { stretch_correct: number; stretch_best_run: number; stretch_level3: number }; styles: { id: string; label: string }[]; note: string; enabled: boolean; dailyLimit: number }
interface Q { id: string; skillId: string; skillName: string; subjectName: string; prompt: string; questionType: string; options: string[] | null; inputKind: any; level: number; styleLabel: string; figureUrl: string | null; figureCaption: string | null; checkedByTeacher: boolean; todayCount: number; dailyLimit: number }
interface Fb { correct: boolean; correctAnswer: string; explanation: string | null; line: string; level: number; newLevel: number; formatProblem?: string; unlocked: { code: string; title: string; description: string }[] }
const LEVEL = ['', 'Stretch 1 · Bridge', 'Stretch 2 · Challenge', 'Stretch 3 · Summit'];

export default function StretchPage() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [skillId, setSkillId] = useState<string>('');
  const [style, setStyle] = useState<string>('');
  const [q, setQ] = useState<Q | null>(null);
  const [fb, setFb] = useState<Fb | null>(null);
  const [answer, setAnswer] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);

  async function loadOverview() {
    try { const j = await (await fetch('/api/stretch/overview')).json(); if (j.error) throw new Error(j.error); setOv(j.data); }
    catch (e: any) { setError(accessErrorMessage(e.message) ?? e.message); }
  }
  useEffect(() => { loadOverview(); }, []);

  async function next() {
    setBusy(true); setError(null); setMessage(null); setFb(null); setAnswer(''); setProblem(null);
    try {
      const j = await (await fetch('/api/stretch/next', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillId: skillId || undefined, style: style || undefined }) })).json();
      if (j.error) throw new Error(j.error);
      setQ(j.data.question); setStartedAt(Date.now());
      if (!j.data.question) setMessage(j.data.message ?? 'No question is ready yet.');
    } catch (e: any) { setError(accessErrorMessage(e.message) ?? e.message); }
    setBusy(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q) return;
    const bad = answerProblem(q.inputKind, q.questionType, answer);
    if (bad) { setProblem(bad); return; }
    setBusy(true); setError(null);
    try {
      const j = await (await fetch('/api/stretch/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: q.id, answer, seconds: Math.round((Date.now() - startedAt) / 1000) }) })).json();
      if (j.error) throw new Error(j.error);
      if (j.data.formatProblem) setProblem(j.data.formatProblem); else { setFb(j.data); loadOverview(); }
    } catch (e: any) { setError(accessErrorMessage(e.message) ?? e.message); }
    setBusy(false);
  }

  const open = ov?.skills ?? [];
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <p className="hero__eyebrow">Challenge zone</p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Try questions beyond the board exam</h1>
      <p style={{ color: 'var(--slate)' }}>For topics you have already shown strong command of. These questions are written in the style of olympiad, NTSE and foundation-level exams. Many people miss them — that is normal. Answers here do not change your marks or progress; they only earn badges.</p>
      {error && <p className="alert">{error}</p>}
      {!ov && !error && <p>Loading…</p>}
      {ov && !ov.enabled && <p>The Challenge zone is switched off for now.</p>}
      {ov && ov.enabled && open.length === 0 && (
        <div className="question-card"><p><strong>Locked for now.</strong> A topic opens here once you show strong command of it in a lesson, quiz or adaptive check ({'75%+'} mastery). Keep going — it will open for you.</p><a className="btn btn--accent" href="/learn">Go to learning</a></div>)}
      {ov && ov.enabled && open.length > 0 && !q && (
        <section style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Open topics ({open.length})</h2>
          <div style={{ display: 'grid', gap: '0.5rem', margin: '0.5rem 0' }}>
            <label>Topic <select value={skillId} onChange={(e) => setSkillId(e.target.value)}><option value="">Any open topic</option>{open.map((s) => <option key={s.skillId} value={s.skillId}>{s.subjectName} — {s.skillName} ({LEVEL[s.level]})</option>)}</select></label>
            <label>Exam style <select value={style} onChange={(e) => setStyle(e.target.value)}><option value="">Any style</option>{ov.styles.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          </div>
          <button className="btn btn--accent" disabled={busy} onClick={next}>{busy ? 'Finding a question…' : 'Give me a challenge'}</button>
          {message && <p style={{ marginTop: '0.6rem' }}>{message}</p>}
        </section>)}
      {q && (
        <form onSubmit={submit} className="question-card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{q.subjectName} · {q.skillName} · {q.styleLabel} · {LEVEL[q.level]}</p>
          {!q.checkedByTeacher && <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>This question is still waiting for a teacher to check it. If something looks wrong, skip it.</p>}
          <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
          <p className="question-card__prompt"><MathText text={q.prompt} /></p>
          {!fb && (q.questionType === 'mcq' && q.options
            ? <div className="mcq-options">{q.options.map((o) => <label key={o} className="mcq-option"><input type="radio" name="st" checked={answer === o} onChange={() => setAnswer(o)} /><MathText text={o} /></label>)}</div>
            : <AnswerInput value={answer} onChange={setAnswer} questionType={q.questionType} inputKind={q.inputKind} autoFocus />)}
          {problem && <p className="alert">{problem}</p>}
          {!fb && <button type="submit" className="btn btn--accent" disabled={busy || !answer}>Check</button>}
          {fb && (
            <div role="status">
              <p><strong>{fb.correct ? 'Correct.' : 'Not this time.'}</strong> {fb.line}</p>
              {!fb.correct && <p>The answer is <MathText text={fb.correctAnswer} />.</p>}
              {fb.explanation && <p style={{ fontSize: '0.9rem' }}><MathText text={fb.explanation} /></p>}
              {fb.newLevel !== fb.level && <p>{fb.newLevel > fb.level ? `Moving up to ${LEVEL[fb.newLevel]}.` : `Stepping back to ${LEVEL[fb.newLevel]} for a while.`}</p>}
              {fb.unlocked.map((b) => <p key={b.code} className="alert" style={{ background: 'var(--sand, #fff7e0)' }}>🏅 New badge: <strong>{b.title}</strong> — {b.description}</p>)}
              <button type="button" className="btn btn--accent" onClick={next}>Next challenge</button>{' '}
              <button type="button" className="btn btn--ghost" onClick={() => { setQ(null); setFb(null); }}>Stop here</button>
            </div>)}
          <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Today: {q.todayCount + (fb ? 1 : 0)} of {q.dailyLimit} Challenge questions.</p>
        </form>)}
      {ov && ov.enabled && (
        <section>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Your badges</h2>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{ov.metrics.stretch_correct} solved · best run {ov.metrics.stretch_best_run} · top-level solved {ov.metrics.stretch_level3}. Badges give no points, money or discounts — they are just for you.</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.4rem' }}>
            {ov.badges.map((b) => <li key={b.code} style={{ opacity: b.unlocked ? 1 : 0.5 }}>{b.unlocked ? '🏅' : '🔒'} <strong>{b.title}</strong> — {b.description}</li>)}
          </ul>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{ov.note}</p>
        </section>)}
    </div></main>
  );
}
