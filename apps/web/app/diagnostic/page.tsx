'use client';

import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';
import { SubjectIcon } from '@/components/SubjectIcon';
import { QuestionFigure } from '@/components/QuestionFigure';
import { MasteryArc } from '@/components/MasteryArc';
import { useLanguage } from '@/components/LanguageProvider';

// Which subjects can be tested comes from each subject's readiness status in
// the database (migration 0013): 'ready' and 'pilot' can be tested; 'coming
// soon' / 'in development' are not offered. Pilot subjects are labelled so a
// student/parent knows their questions are still being reviewed.
const USABLE_STATUSES = ['ready', 'pilot'];

interface SubjectOption {
  id: string;
  slug: string;
  name: string;
  chapterCount: number;
  status: string;
}

interface QuestionView {
  id: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  difficulty: number;
  figureUrl: string | null;
  figureCaption: string | null;
}

interface QuestionReviewEntry {
  questionId: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
}

interface DiagnosticResult {
  strengths: string[];
  weakSkills: string[];
  prerequisiteGaps: string[];
  recommendedStartingSkillId: string;
  questionReview: QuestionReviewEntry[];
}

export default function DiagnosticPage() {
  const { t } = useLanguage();
  const questionLanguageNote = t('common.questionEnglishOnly');
  const [subjects, setSubjects] = useState<SubjectOption[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askedCount, setAskedCount] = useState(0);
  const [resumedNotice, setResumedNotice] = useState(false);

  // Load the subject picker first, instead of starting a diagnostic
  // immediately — a student (or parent) landing here from the "Take a
  // test" link anywhere on the site needs to say which subject before
  // anything can start.
  useEffect(() => {
    fetch('/api/curriculum')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        const options: SubjectOption[] = (json.data?.subjects ?? [])
          .filter((s: any) => USABLE_STATUSES.includes(s.status ?? 'ready') && (s.chapters?.length ?? 0) > 0)
          .map((s: any) => ({ id: s.id, slug: s.slug, name: s.name, chapterCount: s.chapters?.length ?? 0, status: s.status ?? 'ready' }));
        setSubjects(options);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function startDiagnostic(chosenSubjectId: string) {
    setStarting(true);
    setError(null);
    setSubjectId(chosenSubjectId);
    try {
      const res = await fetch('/api/diagnostic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: chosenSubjectId }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAttemptId(json.data.attemptId);
      setQuestion(json.data.question);
      // If this resumed an existing in-progress attempt instead of starting
      // a new one, start the counter from where the student actually left
      // off, not back at 1 — otherwise a resumed student sees "Question 1"
      // on what's really their 4th question.
      setAskedCount((json.data.answeredCount ?? 0) + 1);
      setResumedNotice(!!json.data.resumed);
    } catch (e: any) {
      setError(e.message);
      setSubjectId(null);
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !attemptId) return;
    setLoading(true);
    setError(null);

    const res = await fetch('/api/diagnostic/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, questionId: question.id, answer }),
    });
    const json = await res.json();
    setLoading(false);

    if (json.error) {
      setError(json.error);
      return;
    }
    setAnswer('');
    if (json.data.completed) {
      setResult(json.data.result);
      setQuestion(null);
    } else {
      setQuestion(json.data.question);
      setAskedCount((c) => c + 1);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p style={{ color: 'var(--slate)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="alert">{error}</p>
          <button className="btn btn--ghost" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!subjectId) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Quick diagnostic</p>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Which subject?</h1>
          <p style={{ color: 'var(--slate)' }}>8–15 questions that adapt as you answer — about 10 minutes.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: 'var(--space-2)' }}>
            {(subjects ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => startDiagnostic(s.id)}
                disabled={starting}
                className="subject-card fade-slide-in"
                data-subject={s.slug}
                style={{ width: '100%', textAlign: 'left', cursor: starting ? 'wait' : 'pointer', background: 'white', font: 'inherit', color: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <SubjectIcon slug={s.slug} size={36} />
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {s.name}
                      {s.status === 'pilot' && (
                        <span className="subject-chip__score" style={{ marginLeft: '0.5rem' }}>Pilot</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
                      {s.chapterCount} chapters{s.status === 'pilot' ? ' · questions still being reviewed' : ''}
                    </div>
                  </div>
                </div>
                <span style={{ color: 'var(--marigold-deep)', fontWeight: 500 }}>{starting && subjectId === s.id ? 'Starting…' : '→'}</span>
              </button>
            ))}
            {subjects && subjects.length === 0 && <p style={{ color: 'var(--slate)' }}>No subjects available right now.</p>}
          </div>
        </div>
      </main>
    );
  }

  if (result) {
    const total = result.strengths.length + result.weakSkills.length + result.prerequisiteGaps.length;
    const overallScore = total > 0 ? (result.strengths.length / total) * 100 : 0;
    const overallBand = overallScore >= 80 ? 'strong' : overallScore >= 50 ? 'developing' : overallScore >= 25 ? 'emerging' : 'needs_foundation';
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Diagnostic complete</h1>
          <div className="score-gauge-row">
            <MasteryArc score={overallScore} band={overallBand} label="Overall" size={120} />
            <p style={{ color: 'var(--slate)', margin: 0 }}>
              Strong on {result.strengths.length} of {total} skills checked. We'll start with what
              gives the biggest lift.
            </p>
          </div>
          {result.prerequisiteGaps.length > 0 && (
            <p>
              Found <strong>{result.prerequisiteGaps.length}</strong> foundational gap
              {result.prerequisiteGaps.length > 1 ? 's' : ''} worth shoring up first — that's
              exactly where the first session will begin.
            </p>
          )}
          <section style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.6rem' }}>Your answers, question by question</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {result.questionReview.map((q) => (
                <div
                  key={q.questionId}
                  style={{
                    border: '1px solid var(--line)',
                    borderLeft: `3px solid ${q.isCorrect ? 'var(--mastered)' : 'var(--marigold-deep)'}`,
                    borderRadius: '8px',
                    padding: '0.8rem 1rem',
                  }}
                >
                  <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    <MathText text={q.prompt} />
                  </p>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--slate)' }}>
                    {q.isCorrect ? (
                      <span style={{ color: 'var(--mastered)', fontWeight: 600 }}>Correct</span>
                    ) : (
                      <>
                        <span style={{ color: 'var(--marigold-deep)', fontWeight: 600 }}>Incorrect</span>
                        {' — your answer: '}
                        <MathText text={q.yourAnswer} />
                      </>
                    )}
                  </p>
                  {!q.isCorrect && (
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                      Correct answer: <MathText text={q.correctAnswer} />
                    </p>
                  )}
                  {q.explanation && (
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                      <MathText text={q.explanation} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <a href="/learn" className="btn btn--accent" style={{ marginTop: 'var(--space-4)' }}>
            Start learning
          </a>
        </div>
      </main>
    );
  }

  if (starting && !question) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="loading-pulse" style={{ color: 'var(--slate)' }}>Preparing your diagnostic…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <p className="hero__eyebrow">Question {askedCount} of roughly 8–15</p>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Quick diagnostic</h1>
        {resumedNotice && (
          <p className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>
            {t('diagnostic.resuming')}
          </p>
        )}

        {question && (
          <form onSubmit={submitAnswer}>
            <div className="question-card">
              {/* Brief Section 4: the question bank itself isn't translated yet
                  — clearly label it rather than silently presenting it as
                  fully Hindi-supported. */}
              <p style={{ fontSize: '0.72rem', color: 'var(--slate)', marginBottom: '0.2rem' }}>{questionLanguageNote}</p>
              <QuestionFigure url={question.figureUrl} caption={question.figureCaption} />
              <p className="question-card__prompt">
                <MathText text={question.prompt} />
              </p>

              {question.questionType === 'mcq' && question.options ? (
                <div className="mcq-options">
                  {question.options.map((opt) => (
                    <label key={opt} className="mcq-option">
                      <input type="radio" name="answer" value={opt} checked={answer === opt} onChange={() => setAnswer(opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  className="field__input"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer"
                  autoFocus
                  required
                />
              )}
            </div>

            <button type="submit" className="btn btn--accent" disabled={loading}>
              {loading ? 'Checking…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
