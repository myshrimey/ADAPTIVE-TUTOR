'use client';

import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';

interface QuestionView {
  id: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  difficulty: number;
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
}

interface DiagnosticResult {
  strengths: string[];
  weakSkills: string[];
  prerequisiteGaps: string[];
  recommendedStartingSkillId: string;
  questionReview: QuestionReviewEntry[];
}

export default function DiagnosticPage() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [askedCount, setAskedCount] = useState(0);

  useEffect(() => {
    fetch('/api/diagnostic/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setAttemptId(json.data.attemptId);
        setQuestion(json.data.question);
        setAskedCount(1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading && !question && !result) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p style={{ color: 'var(--slate)' }}>Preparing your diagnostic…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="alert">{error}</p>
        </div>
      </main>
    );
  }

  if (result) {
    const total = result.strengths.length + result.weakSkills.length + result.prerequisiteGaps.length;
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Diagnostic complete</h1>
          <p style={{ color: 'var(--slate)' }}>
            Strong on {result.strengths.length} of {total} skills checked. We'll start with what
            gives the biggest lift.
          </p>
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

  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <p className="hero__eyebrow">Question {askedCount} of roughly 8–15</p>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Quick diagnostic</h1>

        {question && (
          <form onSubmit={submitAnswer}>
            <div className="question-card">
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
