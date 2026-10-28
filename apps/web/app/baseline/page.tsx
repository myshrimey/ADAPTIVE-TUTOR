'use client';
// v62: the adaptive baseline check. No fixed question count: it asks until it has enough evidence, saves progress after
// every answer, and shows where the student can start. Wording never labels the child.
import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';
import { AnswerInput, answerProblem } from '@/components/AnswerInput';
import { QuestionFigure } from '@/components/QuestionFigure';
import { SubjectIcon } from '@/components/SubjectIcon';
import { accessErrorMessage } from '@/lib/access-errors';
import { ReportQuestion } from '@/components/ReportQuestion';

interface Subject { id: string; slug: string; name: string }
interface Q { sessionId: string; step: number; itemId: string; prompt: string; questionType: string; options: string[] | null; inputKind: any; figureUrl: string | null; figureCaption: string | null; why: string; skillName: string; classLevel: number; progress: { answered: number; recommendedMin: number; recommendedMax: number } }
interface Result { version: number; lines: string[]; overall: string; confidence: string; profile: Array<{ label: string; text: string }>; path: Array<{ seq: number; name: string; classLevel: number; stage: string; reason: string; status: string }>; changes: Array<{ name?: string; text: string }>; targetClass: number }

const STAGE: Record<string, string> = { prerequisite_repair: 'Build the foundation', foundation: 'Foundation', core: 'Core', application: 'Apply', reasoning: 'Reason it through' };

export default function BaselinePage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [answer, setAnswer] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState<Result | null>(null);

  useEffect(() => {
    fetch('/api/curriculum').then((r) => r.json()).then((j) => {
      if (j.error) throw new Error(j.error);
      setSubjects((j.data?.subjects ?? []).filter((s: any) => ['ready', 'pilot'].includes(s.status ?? 'ready') && (s.chapters?.length ?? 0) > 0).map((s: any) => ({ id: s.id, slug: s.slug, name: s.name })));
    }).catch((e) => setError(accessErrorMessage(e.message) ?? e.message));
  }, []);

  async function loadResult(id: string): Promise<Result | null> {
    const j = await (await fetch('/api/baseline/result?subjectId=' + id)).json();
    return j.data ? ({ version: j.data.version, lines: j.data.lines, overall: j.data.overall, confidence: j.data.confidence, profile: j.data.profile, path: j.data.path, changes: j.data.changes ?? [], targetClass: j.data.targetClass } as Result) : null;
  }
  async function pick(id: string) {
    setSubjectId(id); setError(null); setBusy(true);
    try { setSaved(await loadResult(id)); } catch { /* none yet */ }
    setBusy(false);
  }
  async function start(mini: boolean) {
    if (!subjectId) return;
    setBusy(true); setError(null);
    try {
      const j = await (await fetch('/api/baseline/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId, mini }) })).json();
      if (j.error) throw new Error(j.error);
      setQ(j.data.question);
      if (j.data.finished && !j.data.question) setResult(await loadResult(subjectId));
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
      const j = await (await fetch('/api/baseline/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: q.sessionId, answer }) })).json();
      if (j.error) throw new Error(j.error);
      if (j.data.feedback?.formatProblem) { setProblem(j.data.feedback.formatProblem); setBusy(false); return; }
      setAnswer(''); setProblem(null);
      if (j.data.finished) { setQ(null); setResult(await loadResult(subjectId!)); }
      else setQ(j.data.question);
    } catch (e: any) { setError(accessErrorMessage(e.message) ?? e.message); }
    setBusy(false);
  }

  const shell = (children: React.ReactNode) => (<main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>{children}</div></main>);

  if (result || (saved && !q)) {
    const r = (result ?? saved)!;
    return shell(<>
      <p className="hero__eyebrow">Your starting point</p>
      <h1 style={{ fontSize: 'var(--step-3)' }}>{result ? 'Check complete' : 'Your latest check'}</h1>
      <p style={{ color: 'var(--slate)' }}>{r.overall}</p>
      {r.lines.map((l, i) => <p key={i} style={i === 0 ? { fontWeight: 600 } : undefined}>{l}</p>)}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Skills by area</h2>
      <ul>{r.profile.map((p) => <li key={p.label}><strong>{p.label}:</strong> {p.text}</li>)}</ul>
      {r.changes.length > 0 && <><h2 style={{ fontSize: 'var(--step-1)' }}>What changed since last time</h2><ul>{r.changes.slice(0, 8).map((c, i) => <li key={i}>{c.text}</li>)}</ul></>}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Your learning path</h2>
      <p style={{ color: 'var(--slate)' }}>Only the skills you need, in order. You are not asked to repeat things you already showed you can do.</p>
      <ol>{r.path.slice(0, 12).map((n) => <li key={n.seq} style={{ marginBottom: '0.4rem' }}><strong>{n.name}</strong> <span style={{ color: 'var(--slate)' }}>({STAGE[n.stage] ?? n.stage}, usually Class {n.classLevel})</span><br /><span style={{ fontSize: '0.9rem', color: 'var(--ink-soft)' }}>{n.reason}</span></li>)}</ol>
      {r.path.length > 12 && <p style={{ color: 'var(--slate)' }}>…and {r.path.length - 12} more steps.</p>}
      <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>This is a starting point based on the questions you answered, not an official class placement or a prediction of marks.</p>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <a className="btn btn--accent" href={`/baseline/path?subjectId=${subjectId}`}>Start my learning path</a>
        <button className="btn btn--ghost" disabled={busy} onClick={() => { setResult(null); setSaved(null); start(true); }}>Short re-check</button>
        <a className="btn btn--ghost" href="/stretch">Try the Challenge zone</a>
      </div>
      {error && <p className="alert">{error}</p>}
    </>);
  }

  if (!subjectId) {
    return shell(<>
      <p className="hero__eyebrow">Adaptive check</p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Find your starting point</h1>
      <p style={{ color: 'var(--slate)' }}>Sahayak asks a few questions and decides what to ask next from your answers. It stops when it has seen enough, usually about 15 to 30 questions. Your progress is saved, so you can stop and continue later. A wrong answer is never a verdict: Sahayak first looks for the reason.</p>
      {error && <p className="alert">{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: 'var(--space-2)' }}>
        {(subjects ?? []).map((s) => (
          <button key={s.id} type="button" onClick={() => pick(s.id)} className="subject-card fade-slide-in" data-subject={s.slug} style={{ width: '100%', textAlign: 'left', background: 'white', font: 'inherit', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><SubjectIcon slug={s.slug} size={36} /><div style={{ fontWeight: 500 }}>{s.name}</div></div><span style={{ color: 'var(--marigold-deep)' }}>→</span>
          </button>))}
      </div>
    </>);
  }

  if (!q) {
    return shell(<>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{subjects?.find((s) => s.id === subjectId)?.name}</h1>
      {error && <p className="alert">{error}</p>}
      <p style={{ color: 'var(--slate)' }}>Ready? There is no fixed number of questions. You can stop at any point and continue later.</p>
      <button className="btn btn--accent" disabled={busy} onClick={() => start(false)}>{busy ? 'Preparing…' : 'Start / continue'}</button>
    </>);
  }

  return shell(<>
    <p className="hero__eyebrow">Question {q.progress.answered + 1} · usually {q.progress.recommendedMin}–{q.progress.recommendedMax} in all</p>
    <h1 style={{ fontSize: 'var(--step-2)' }}>Adaptive check</h1>
    <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginTop: 0 }}>Why this question? {q.why}</p>
    {error && <p className="alert">{error}</p>}
    <form onSubmit={submit}>
      <div className="question-card">
        <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
        <p className="question-card__prompt"><MathText text={q.prompt} /></p>
        <ReportQuestion id={q.itemId} />
        {q.questionType === 'mcq' && q.options ? (
          <div className="mcq-options">{q.options.map((opt) => (<label key={opt} className="mcq-option"><input type="radio" name="answer" value={opt} checked={answer === opt} onChange={() => setAnswer(opt)} /><MathText text={opt} /></label>))}</div>
        ) : (<AnswerInput value={answer} onChange={(v) => { setAnswer(v); setProblem(null); }} questionType={q.questionType} inputKind={q.inputKind} autoFocus />)}
        {problem && <p role="alert" style={{ color: '#b45309', fontSize: '0.9rem' }}>⚠ {problem}</p>}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn--accent" disabled={busy}>{busy ? 'Checking…' : 'Submit'}</button>
        <a className="btn btn--ghost" href="/dashboard">Save and continue later</a>
      </div>
    </form>
  </>);
}
