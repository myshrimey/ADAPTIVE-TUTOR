'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MathText } from '@/components/MathText';
import { QuestionFigure } from '@/components/QuestionFigure';
import { useLanguage } from '@/components/LanguageProvider';

interface SubjectOpt {
  id: string;
  name: string;
  status: string;
  registered: boolean;
}
interface QView {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  figureUrl: string | null;
  figureCaption: string | null;
}
interface Review {
  questionId: string;
  prompt: string;
  chapter: string;
  yourAnswer: string;
  correctAnswer: string;
  answered: boolean;
  isCorrect: boolean;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
}
interface Result {
  score: number;
  total: number;
  percent: number;
  unanswered: number;
  timeUsedSeconds: number;
  autoSubmitted: boolean;
  byChapter: { chapter: string; correct: number; total: number }[];
  review: Review[];
}
interface Exam {
  id: string;
  subjectName: string;
  status: 'in_progress' | 'submitted';
  deadlineAt: string;
  serverNow: string;
  questions: QView[];
  answers: Record<string, string>;
  result: Result | null;
}

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function MockPage() {
  const { t } = useLanguage();
  const tt = t as (k: string, v?: Record<string, string | number>) => string;

  const [subjects, setSubjects] = useState<SubjectOpt[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [autoNote, setAutoNote] = useState(false);

  const answersRef = useRef(answers);
  const examRef = useRef<Exam | null>(null);
  const offsetRef = useRef(0); // server clock minus client clock
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  answersRef.current = answers;
  examRef.current = exam;

  useEffect(() => {
    fetch('/api/student/subjects')
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          window.location.href = '/';
          return;
        }
        const usable = (j.data.subjects as SubjectOpt[]).filter((s) => s.registered && (s.status === 'ready' || s.status === 'pilot'));
        setSubjects(usable);
        if (usable.length > 0) setSubjectId(usable[0].id);
      })
      .catch(() => setSubjects([]));
  }, []);

  const beginExam = useCallback((e: Exam) => {
    offsetRef.current = new Date(e.serverNow).getTime() - Date.now();
    setExam(e);
    setAnswers(e.answers ?? {});
    dirtyRef.current = false;
    submittingRef.current = false;
    if (e.status === 'submitted' && e.result) setResult(e.result);
  }, []);

  async function start() {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/mock/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      beginExam(json.data);
    } catch (e: any) {
      setError(e.message === 'not_enough_questions' ? tt('mock.notEnough') : e.message);
    } finally {
      setLoading(false);
    }
  }

  const doSubmit = useCallback(
    async (auto: boolean) => {
      const ex = examRef.current;
      if (!ex || submittingRef.current) return;
      submittingRef.current = true;
      setLoading(true);
      try {
        const res = await fetch(`/api/mock/${ex.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersRef.current, auto }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setResult(json.data);
        setAutoNote(auto || !!json.data.autoSubmitted);
        setExam({ ...ex, status: 'submitted' });
      } catch (e: any) {
        submittingRef.current = false;
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Countdown (derived from the server deadline each tick, so a sleeping tab can't drift).
  useEffect(() => {
    if (!exam || exam.status !== 'in_progress' || result) return;
    const tick = () => {
      const left = Math.round((new Date(exam.deadlineAt).getTime() - (Date.now() + offsetRef.current)) / 1000);
      setRemaining(left);
      if (left <= 0) doSubmit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exam, result, doSubmit]);

  // Autosave: shortly after any change, and every 30 s as a safety net.
  const save = useCallback(async () => {
    const ex = examRef.current;
    if (!ex || ex.status !== 'in_progress' || !dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      const res = await fetch(`/api/mock/${ex.id}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: answersRef.current }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSaveState('saved');
    } catch {
      dirtyRef.current = true;
      setSaveState('failed');
    }
  }, []);

  useEffect(() => {
    if (!exam || exam.status !== 'in_progress' || result) return;
    const id = setInterval(save, 30000);
    return () => clearInterval(id);
  }, [exam, result, save]);

  function setAnswer(qid: string, value: string) {
    dirtyRef.current = true;
    setSaveState('idle');
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    window.clearTimeout((setAnswer as any)._t);
    (setAnswer as any)._t = window.setTimeout(save, 1500);
  }

  function handleSubmit() {
    if (!exam) return;
    const unanswered = exam.questions.filter((q) => !(answers[q.id] ?? '').trim()).length;
    if (unanswered > 0 && !window.confirm(tt('mock.submitConfirm', { n: unanswered }))) return;
    doSubmit(false);
  }

  // ------------------------------------------------------------ result view
  if (result && exam) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>{tt('mock.resultTitle')}</h1>
          <p style={{ color: 'var(--slate)' }}>{exam.subjectName}</p>
          {autoNote && <p role="status">{tt('mock.timeUp')}</p>}
          <p style={{ fontSize: 'var(--step-1)', fontWeight: 600 }}>{tt('mock.score', { score: result.score, total: result.total, percent: result.percent })}</p>
          <p style={{ color: 'var(--slate)' }}>
            {tt('mock.unanswered', { n: result.unanswered })} · {tt('mock.timeUsed', { m: Math.max(1, Math.round(result.timeUsedSeconds / 60)) })}
          </p>

          <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>{tt('mock.byChapter')}</h2>
          <div>
            {result.byChapter.map((c) => (
              <div key={c.chapter} style={{ margin: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>{c.chapter}</span>
                  <span>
                    {c.correct}/{c.total}
                  </span>
                </div>
                <div className="progress-bar" aria-hidden="true">
                  <div className="progress-bar__fill" style={{ width: `${c.total ? (c.correct / c.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{tt('mock.note')}</p>

          <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>{tt('mock.review')}</h2>
          {result.review.map((r, i) => (
            <div key={r.questionId} className="mock-review" data-correct={r.isCorrect} style={{ padding: '0.8rem 0', borderTop: '1px solid var(--line, #ddd)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                {tt('mock.question', { n: i + 1 })} · {r.chapter} · {r.isCorrect ? tt('mock.correct') : tt('mock.incorrect')}
              </div>
              <QuestionFigure url={r.figureUrl} caption={r.figureCaption} />
              <p>
                <MathText text={r.prompt} />
              </p>
              <p style={{ margin: '0.2rem 0' }}>
                {tt('mock.yourAnswer')}: <strong>{r.answered ? <MathText text={r.yourAnswer} /> : tt('mock.notAnswered')}</strong>
              </p>
              {!r.isCorrect && (
                <p style={{ margin: '0.2rem 0' }}>
                  {tt('mock.correctAnswer')}: <strong><MathText text={r.correctAnswer} /></strong>
                </p>
              )}
              {!r.isCorrect && r.explanation && (
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>
                  <MathText text={r.explanation} />
                </p>
              )}
            </div>
          ))}

          <div className="hero__actions" style={{ marginTop: 'var(--space-3)' }}>
            <button
              className="btn btn--accent"
              onClick={() => {
                setExam(null);
                setResult(null);
                setAnswers({});
                setAutoNote(false);
              }}
            >
              {tt('mock.again')}
            </button>
            <a className="btn btn--ghost" href="/report">
              {tt('nav.report')}
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------- exam view
  if (exam && exam.status === 'in_progress') {
    const answeredCount = exam.questions.filter((q) => (answers[q.id] ?? '').trim()).length;
    return (
      <main className="page">
        <div className="shell shell--narrow">
          <div
            className="mock-bar"
            style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--paper, #fff)', padding: '0.6rem 0', borderBottom: '1px solid var(--line, #ddd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
          >
            <div>
              <strong>{exam.subjectName}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{tt('mock.answered', { n: answeredCount, total: exam.questions.length })}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{tt('mock.timeLeft')}</div>
              <div role="timer" aria-live="off" style={{ fontSize: '1.4rem', fontWeight: 700, color: remaining <= 300 ? 'var(--danger, #b3261e)' : undefined }}>
                {fmt(remaining)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate)', minHeight: '1.2rem' }} role="status">
            {saveState === 'saved' && tt('mock.saved')}
            {saveState === 'failed' && tt('mock.saveFailed')}
          </div>

          {exam.questions.map((q, i) => (
            <div key={q.id} style={{ padding: '0.9rem 0', borderBottom: '1px solid var(--line, #eee)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{tt('mock.question', { n: i + 1 })}</div>
              <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
              <p>
                <MathText text={q.prompt} />
              </p>
              {q.questionType === 'mcq' && q.options ? (
                <div className="mcq-options">
                  {q.options.map((opt) => (
                    <label key={opt} className="mcq-option">
                      <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input className="field__input" value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder={tt('mock.typeAnswer')} maxLength={200} />
              )}
            </div>
          ))}

          {error && <p className="field__error">{error}</p>}
          <div className="hero__actions" style={{ margin: 'var(--space-3) 0' }}>
            <button className="btn btn--accent" onClick={handleSubmit} disabled={loading}>
              {tt('mock.submit')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------ start view
  const chosen = subjects?.find((s) => s.id === subjectId);
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>{tt('mock.title')}</h1>
        <p style={{ color: 'var(--slate)' }}>{tt('mock.intro')}</p>
        {subjects === null ? null : subjects.length === 0 ? (
          <p>
            {tt('mock.noSubjects')} <a href="/subjects">{tt('subject.manageTitle')}</a>
          </p>
        ) : (
          <>
            <div className="field">
              <label className="field__label" htmlFor="mock-subject">
                {tt('mock.pickSubject')}
              </label>
              <select id="mock-subject" className="field__input" value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {chosen?.status === 'pilot' && <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{tt('mock.pilotNote')}</p>}
            {error && <p className="field__error">{error}</p>}
            <div className="hero__actions">
              <button className="btn btn--accent" onClick={start} disabled={loading || !subjectId}>
                {loading ? tt('mock.starting') : tt('mock.start')}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
