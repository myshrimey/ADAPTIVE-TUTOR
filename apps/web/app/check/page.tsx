'use client';

import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';

interface Q { id: string; prompt: string; options: string[] }
interface Result { correct: number; total: number; byChapter: { chapter: string; correct: number; total: number }[] }

// Free readiness check: no sign-in, nothing stored. A small taste of the diagnostic, not a measure of the board exam.
export default function CheckPage() {
  const [subject, setSubject] = useState<'maths' | 'science'>('maths');
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(sub: 'maths' | 'science') {
    setBusy(true);
    setError(null);
    setResult(null);
    setAnswers({});
    setQuestions(null);
    try {
      const res = await fetch(`/api/public/check?subject=${sub}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setQuestions(json.data.questions);
      setName(json.data.subject);
    } catch {
      setError('The check is not available right now. Please try again a little later.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(subject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/public/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json.data);
    } catch {
      setError('Could not check your answers. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const answered = Object.keys(answers).length;

  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Free readiness check</h1>
        <p style={{ color: 'var(--slate)' }}>
          Eight quick multiple-choice questions, no sign-in and nothing saved. It shows roughly which chapters to look at first. It is a taste of Sahayak&apos;s diagnostic, not a prediction of board marks.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="chk-sub">Subject</label>
          <select id="chk-sub" className="field__input" value={subject} onChange={(e) => setSubject(e.target.value as 'maths' | 'science')} disabled={busy}>
            <option value="maths">Mathematics</option>
            <option value="science">Science</option>
          </select>
        </div>
        {error && <p className="alert">{error}</p>}
        {busy && !questions && <p>Loading questions…</p>}

        {result ? (
          <section>
            <p style={{ fontSize: 'var(--step-1)', fontWeight: 600 }}>{result.correct} of {result.total} correct in {name}</p>
            <p style={{ color: 'var(--slate)' }}>Chapters to look at first are at the top. Eight questions are only a small sample, so treat this as a starting point.</p>
            {result.byChapter.map((c) => (
              <div key={c.chapter} style={{ margin: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>{c.chapter}</span><span>{c.correct}/{c.total}</span></div>
                <div className="progress-bar" aria-hidden="true"><div className="progress-bar__fill" style={{ width: `${c.total ? (c.correct / c.total) * 100 : 0}%` }} /></div>
              </div>
            ))}
            <p style={{ marginTop: 'var(--space-3)' }}>
              Want the full picture for every subject, and a tutor that teaches from the gaps? <a href="/contact">Ask us for an account</a>, or see <a href="/sample-report">a sample report</a>.
            </p>
            <button className="btn btn--ghost" onClick={() => load(subject)}>Try another set</button>
          </section>
        ) : (
          questions && (
            <>
              {questions.map((q, i) => (
                <div key={q.id} style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--line, #eee)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Question {i + 1}</div>
                  <p><MathText text={q.prompt} /></p>
                  <div className="mcq-options">
                    {q.options.map((opt) => (
                      <label key={opt} className="mcq-option">
                        <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} />
                        <MathText text={opt} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="hero__actions" style={{ marginTop: 'var(--space-3)' }}>
                <button className="btn btn--accent" onClick={submit} disabled={busy || answered === 0}>
                  {busy ? 'Checking…' : `See my result (${answered}/${questions.length} answered)`}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </main>
  );
}
