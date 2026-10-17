'use client';

import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';
import { accessErrorMessage } from '@/lib/access-errors';

interface SubjectOpt { id: string; name: string; status: string; registered: boolean }
interface Q { id: string; prompt: string; chapter: string; maxScore: number }
interface Marking { score: number; maxScore: number; keyPoints: { point: string; covered: boolean }[]; feedback: string }
interface Hist { id: string; score: number; maxScore: number; at: string; prompt: string }

// Written-answer practice: write a few sentences, get suggested marks and feedback from AI.
export default function WrittenPage() {
  const [subjects, setSubjects] = useState<SubjectOpt[] | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [marking, setMarking] = useState<Marking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Hist[]>([]);

  const loadHistory = () => fetch('/api/written/history').then((r) => r.json()).then((j) => { if (!j.error) setHistory(j.data.history); }).catch(() => {});

  useEffect(() => {
    fetch('/api/student/subjects').then((r) => r.json()).then((j) => {
      if (j.error) { window.location.href = '/'; return; }
      const usable = (j.data.subjects as SubjectOpt[]).filter((s) => s.registered && (s.status === 'ready' || s.status === 'pilot'));
      setSubjects(usable);
      if (usable[0]) setSubjectId(usable[0].id);
    }).catch(() => setSubjects([]));
    loadHistory();
  }, []);

  const friendly = (e: string) =>
    e === 'no_written_questions' ? 'This subject has no written-answer questions yet.'
    : e === 'answer_too_short' ? 'Please write a little more before sending.'
    : e === 'marking_failed' ? 'The marking did not work this time. Please try again.'
    : accessErrorMessage(e) ?? e;

  async function start() {
    setBusy(true); setError(null); setMarking(null); setAnswer(''); setIdx(0);
    try {
      const res = await fetch('/api/written/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setQuestions(json.data.questions);
    } catch (e: any) { setError(friendly(e.message)); } finally { setBusy(false); }
  }

  async function submit() {
    if (!questions) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/written/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: questions[idx].id, answer }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMarking(json.data);
      loadHistory();
    } catch (e: any) { setError(friendly(e.message)); } finally { setBusy(false); }
  }

  function next() {
    setMarking(null); setAnswer('');
    if (questions && idx + 1 < questions.length) setIdx(idx + 1);
    else setQuestions(null);
  }

  const q = questions?.[idx];
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Written-answer practice</h1>
        <p style={{ color: 'var(--slate)' }}>
          Write a few sentences in your own words. You get suggested marks and feedback on what to add. The marks come from an AI checking your answer against the answer key, so a teacher may mark differently. It is practice only and does not change your learning progress.
        </p>
        {error && <p className="alert">{error}</p>}

        {!q ? (
          subjects === null ? null : subjects.length === 0 ? (
            <p>Register a subject first. <a href="/subjects">Choose subjects</a></p>
          ) : (
            <>
              <div className="field">
                <label className="field__label" htmlFor="w-sub">Subject</label>
                <select id="w-sub" className="field__input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <button className="btn btn--accent" onClick={start} disabled={busy || !subjectId}>{busy ? 'Preparing…' : 'Start 5 questions'}</button>
            </>
          )
        ) : (
          <section>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Question {idx + 1} of {questions!.length} · {q.chapter} · {q.maxScore} marks</div>
            <p style={{ fontSize: 'var(--step-1)' }}><MathText text={q.prompt} /></p>
            {!marking ? (
              <>
                <textarea className="field__input" rows={6} value={answer} maxLength={1500} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer here…" disabled={busy} />
                <div className="hero__actions" style={{ marginTop: '0.6rem' }}>
                  <button className="btn btn--accent" onClick={submit} disabled={busy || answer.trim().length < 3}>{busy ? 'Marking…' : 'Send for marking'}</button>
                </div>
              </>
            ) : (
              <div className="chapter-row" style={{ display: 'block' }}>
                <p style={{ fontSize: 'var(--step-1)', fontWeight: 600 }}>Suggested marks: {marking.score} out of {marking.maxScore}</p>
                {marking.keyPoints.length > 0 && (
                  <ul style={{ paddingLeft: '1.1rem' }}>
                    {marking.keyPoints.map((k, i) => (<li key={i}>{k.covered ? '✓' : '✗'} {k.point}</li>))}
                  </ul>
                )}
                {marking.feedback && <p>{marking.feedback}</p>}
                <button className="btn btn--accent" onClick={next}>{idx + 1 < questions!.length ? 'Next question' : 'Finish'}</button>
              </div>
            )}
          </section>
        )}

        {history.length > 0 && !q && (
          <section style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--step-1)' }}>Your recent written answers</h2>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
              {history.map((h) => (<li key={h.id}>{new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {h.score}/{h.maxScore} · {h.prompt.slice(0, 80)}{h.prompt.length > 80 ? '…' : ''}</li>))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
