'use client';

import { useEffect, useState } from 'react';

interface QuestionView {
  id: string;
  skillId: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  difficulty: number;
}

interface DiagnosticResult {
  strengths: string[];
  weakSkills: string[];
  prerequisiteGaps: string[];
  recommendedStartingSkillId: string;
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
          <a href="/learn" className="btn btn--accent" style={{ marginTop: 'var(--space-2)' }}>
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
              <p className="question-card__prompt">{question.prompt}</p>

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
