'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckInForm, type CheckinAnswers } from '@/components/CheckInForm';
import { MathText } from '@/components/MathText';
import { QuestionFigure } from '@/components/QuestionFigure';
import { MasteryArc } from '@/components/MasteryArc';
import { accessErrorMessage } from '@/lib/access-errors';
import { AnimatedDiagram } from '@/components/AnimatedDiagram';
import { AnswerFeedback } from '@/components/AnswerFeedback';
import { SessionProgressReveal, type SessionProgress } from '@/components/SessionProgressReveal';
import { animationLevelForScore } from '@adaptive-tutor/core';

interface ChatMessage {
  role: 'tutor' | 'student';
  content: string;
  diagram?: { url: string; caption: string } | null; // a teaching diagram for this turn's skill, if one exists (packages/core/learning-diagrams/mapping.ts) — distinct from a question's own imageUrl below
}

interface ActiveQuestion {
  id: string;
  prompt: string;
  questionType: string;
  options?: string[];
  figureUrl?: string | null;
  figureCaption?: string | null;
}

interface SessionSummary {
  whatYouLearned: string[];
  whatYouCanNowDo: string[];
  needsPractice: string[];
  nextRecommendation: { skillId: string | null; reason: string };
  progress?: SessionProgress;
}

// What's being taught right now, for the sidebar — fetched once at session
// start (packages/core's objective doesn't change mid-session), not
// refetched on every turn.
interface SessionContext {
  subjectName: string | null;
  chapterName: string | null;
  topicName: string | null;
  skillName: string | null;
  masteryScore: number;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  figureUrl?: string | null;
  figureCaption?: string | null;
}

interface QuizReviewEntry {
  questionId: string;
  prompt: string;
  questionType: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  figureUrl?: string | null;
  figureCaption?: string | null;
}

interface QuizResult {
  score: number;
  total: number;
  review: QuizReviewEntry[];
}

// The API returns internal error codes (gemini_request_timeout,
// gemini_request_failed: 404 ..., etc.) meant for logs/debugging, not a
// student's screen. This translates the ones worth explaining differently;
// anything unmatched just shows as-is rather than hiding a real signal.
function friendlyError(raw: string): string {
  const accessMsg = accessErrorMessage(raw);
  if (accessMsg) return accessMsg;
  // Every free-tier AI provider in the chain (ai-provider/factory.ts) failed
  // for this turn — not just one hiccup. Distinct from a single provider's
  // own error below: this is the "capacity is genuinely exhausted right
  // now" message, which is also the natural place to mention a paid plan
  // once one exists — swap in the real link/name when it does.
  if (raw.startsWith('all_ai_providers_unavailable')) {
    return "The tutor is at capacity across every free AI service we use right now — this isn't something retrying will fix immediately. Please try again in a few minutes. If this keeps happening, a paid or priority version of this app (once available) would avoid shared free-tier limits like this entirely.";
  }
  if (raw.startsWith('gemini_request_timeout') || raw.startsWith('groq_request_timeout')) {
    return "The tutor is taking too long to respond. This is usually temporary — try sending that again.";
  }
  if (
    raw.startsWith('gemini_request_failed') ||
    raw.startsWith('gemini_request_network_error') ||
    raw.startsWith('groq_request_failed') ||
    raw.startsWith('groq_request_network_error')
  ) {
    return "Couldn't reach the tutor right now. Please try again in a moment.";
  }
  if (raw === 'unauthenticated') {
    return 'Your session expired — please sign in again.';
  }
  return raw;
}

export default function LearnPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [context, setContext] = useState<SessionContext | null>(null);
  // Presentation pacing follows the student's level on THIS skill at session start. Never affects mastery or difficulty.
  const animLevel = context ? animationLevelForScore(context.masteryScore) : 'standard';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-session check-in (v34). The session is created only after the student
  // answers (or skips) the short check-in, so "recovery mode" can shape the
  // opening question.
  const [checkinDone, setCheckinDone] = useState(false);
  const [hadCheckin, setHadCheckin] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [confidenceAfter, setConfidenceAfter] = useState<number | null>(null);
  const [confidenceSaved, setConfidenceSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live progress, tracked client-side from each answer turn's evaluation —
  // no extra backend call needed, just a running count of what's already
  // come back from /api/session/answer.
  const [plan, setPlan] = useState<{ done: number; target: number | null; finalQuestion: boolean; finished: boolean; gentler: boolean } | null>(null);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  // Brief level-matched cue after each answer (see components/AnswerFeedback.tsx).
  const [lastFeedback, setLastFeedback] = useState<{ correct: boolean; n: number } | null>(null);
  useEffect(() => {
    if (!lastFeedback) return;
    const id = window.setTimeout(() => setLastFeedback(null), 2400);
    return () => window.clearTimeout(id);
  }, [lastFeedback]);

  // Set once the session is actually closed — switches the whole page over
  // to the summary view instead of silently redirecting to /dashboard with
  // nothing shown. completeSession() (packages/core) already computes this;
  // it was just being thrown away before.
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [ending, setEnding] = useState(false);

  // The short quiz shown between "session ended" and "here's your summary" —
  // a few questions on the skill just taught, with grading and solutions.
  // Holding the summary here while the quiz runs means the student still
  // sees it right after, rather than it being skipped.
  const [pendingSummary, setPendingSummary] = useState<SessionSummary | null>(null);
  const [quizPhase, setQuizPhase] = useState<'none' | 'loading' | 'taking' | 'graded'>('none');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCollected, setQuizCollected] = useState<{ questionId: string; answer: string }[]>([]);
  const [quizInput, setQuizInput] = useState('');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  function startSession(checkin?: CheckinAnswers) {
    setCheckinDone(true);
    setHadCheckin(!!checkin);
    setLoading(true);
    fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkin ? { checkin } : {}),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSessionId(json.data.sessionId);
        setSkillId(json.data.skillId ?? null);
        setContext(json.data.context ?? null);
        setRecoveryMode(!!json.data.recoveryMode);
        setMessages([{ role: 'tutor', content: json.data.turn.tutorMessage, diagram: json.data.turn.diagram ?? null }]);
        setActiveQuestion(json.data.turn.activeQuestion ?? null);
        setPlan(json.data.turn.plan ?? null);
      })
      .catch((e) => setError(friendlyError(e.message)))
      .finally(() => setLoading(false));
  }

  async function saveConfidenceAfter(value: number) {
    setConfidenceAfter(value);
    if (!sessionId) return;
    try {
      await fetch('/api/session/checkin-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, confidenceAfter: value }),
      });
      setConfidenceSaved(true);
    } catch {
      // Non-critical — never block the summary over this.
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !input.trim()) return;
    const text = input;
    const wasAnswer = !!activeQuestion;
    setInput('');
    setMessages((m) => [...m, { role: 'student', content: text }]);
    setLoading(true);

    const endpoint = activeQuestion ? '/api/session/answer' : '/api/session/message';
    const body = activeQuestion
      ? JSON.stringify({ sessionId, questionId: activeQuestion.id, answer: text })
      : JSON.stringify({ sessionId, message: text });

    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const json = await res.json();
    setLoading(false);

    if (json.error) {
      setError(friendlyError(json.error));
      return;
    }
    if (wasAnswer && json.data.evaluation) {
      setAnswered((n) => n + 1);
      if (json.data.evaluation.isCorrect) setCorrect((n) => n + 1);
      setLastFeedback((f) => ({ correct: !!json.data.evaluation.isCorrect, n: (f?.n ?? 0) + 1 }));
    }
    setMessages((m) => [...m, { role: 'tutor', content: json.data.tutorMessage, diagram: json.data.diagram ?? null }]);
    setActiveQuestion(json.data.activeQuestion ?? null);
    if (json.data.plan) setPlan(json.data.plan);
  }

  async function requestHint() {
    if (!sessionId) return;
    setLoading(true);
    const res = await fetch('/api/session/hint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    const json = await res.json();
    setLoading(false);
    if (json.error) return setError(friendlyError(json.error));
    setMessages((m) => [...m, { role: 'tutor', content: json.data.tutorMessage, diagram: json.data.diagram ?? null }]);
  }

  async function endSession() {
    if (!sessionId) return;
    setEnding(true);
    setError(null);
    const res = await fetch('/api/session/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    const json = await res.json();
    setEnding(false);
    if (json.error) return setError(friendlyError(json.error));

    setPendingSummary(json.data);

    if (!skillId) {
      setSummary(json.data);
      return;
    }

    setQuizPhase('loading');
    try {
      const qRes = await fetch('/api/quiz/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillId }) });
      const qJson = await qRes.json();
      if (!qJson.error && qJson.data?.questions?.length > 0) {
        setQuizQuestions(qJson.data.questions);
        setQuizIndex(0);
        setQuizCollected([]);
        setQuizInput('');
        setQuizPhase('taking');
      } else {
        setQuizPhase('none');
        setSummary(json.data);
      }
    } catch {
      setQuizPhase('none');
      setSummary(json.data);
    }
  }

  async function submitQuizAnswer(e: React.FormEvent) {
    e.preventDefault();
    const q = quizQuestions[quizIndex];
    if (!q) return;
    const nextCollected = [...quizCollected, { questionId: q.id, answer: quizInput }];
    setQuizCollected(nextCollected);
    setQuizInput('');

    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((i) => i + 1);
      return;
    }

    setQuizSubmitting(true);
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answers: nextCollected }),
    });
    const json = await res.json();
    setQuizSubmitting(false);
    if (json.error) {
      // Grading failed — don't block the student from seeing their summary over a quiz hiccup.
      setQuizPhase('none');
      setSummary(pendingSummary);
      return;
    }
    setQuizResult(json.data);
    setQuizPhase('graded');
  }

  function skipQuiz() {
    setQuizPhase('none');
    setSummary(pendingSummary);
  }

  function finishQuiz() {
    setSummary(pendingSummary);
  }

  if (!checkinDone) {
    return <CheckInForm onSubmit={(a) => startSession(a)} onSkip={() => startSession()} />;
  }

  if (quizPhase === 'loading') {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="loading-pulse" style={{ color: 'var(--slate)' }}>
            Putting together a quick quiz…
          </p>
        </div>
      </main>
    );
  }

  if (quizPhase === 'taking') {
    const q = quizQuestions[quizIndex];
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Quick quiz · Question {quizIndex + 1} of {quizQuestions.length}</p>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Check what you just learned</h1>
          <div className="progress-bar" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="progress-bar__fill" style={{ width: `${((quizIndex) / quizQuestions.length) * 100}%` }} />
          </div>

          {q && (
            <form onSubmit={submitQuizAnswer}>
              <div className="question-card fade-slide-in">
                <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />
                <p className="question-card__prompt">
                  <MathText text={q.prompt} />
                </p>
                {q.questionType === 'mcq' && q.options ? (
                  <div className="mcq-options">
                    {q.options.map((opt) => (
                      <label key={opt} className="mcq-option">
                        <input type="radio" name="quiz-answer" value={opt} checked={quizInput === opt} onChange={() => setQuizInput(opt)} />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="field__input"
                    value={quizInput}
                    onChange={(e) => setQuizInput(e.target.value)}
                    placeholder="Your answer"
                    autoFocus
                    required
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="submit" className="btn btn--accent" disabled={quizSubmitting}>
                  {quizSubmitting ? 'Grading…' : quizIndex + 1 < quizQuestions.length ? 'Next' : 'Submit quiz'}
                </button>
                <button type="button" onClick={skipQuiz} className="btn btn--ghost">
                  Skip quiz
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    );
  }

  if (quizPhase === 'graded' && quizResult) {
    const pct = quizResult.total > 0 ? Math.round((quizResult.score / quizResult.total) * 100) : 0;
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <div className="quiz-score-banner pop-in">
            <MasteryArc
              score={pct}
              band={pct >= 80 ? 'strong' : pct >= 50 ? 'developing' : pct >= 25 ? 'emerging' : 'needs_foundation'}
              label={`${quizResult.score}/${quizResult.total} correct`}
              size={120}
            />
            <span className="quiz-score-banner__label">
              {pct >= 80 ? "Great work!" : pct >= 50 ? 'Good effort — keep practicing.' : "That's okay — review the solutions below."}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: 'var(--space-3)' }}>
            {quizResult.review.map((q, i) => (
              <div
                key={q.questionId}
                className="fade-slide-in"
                style={{
                  animationDelay: `${i * 0.06}s`,
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

          <button onClick={finishQuiz} className="btn btn--accent" style={{ marginTop: 'var(--space-4)' }}>
            Continue to session summary
          </button>
        </div>
      </main>
    );
  }

  if (summary) {
    return (
      <main className="page">
        <div className="shell shell--narrow">
          <div style={{ paddingTop: 'var(--space-3)' }}>
            <h1 style={{ fontSize: 'var(--step-2)', marginBottom: 'var(--space-1)' }}>Session complete</h1>
            <p style={{ color: 'var(--slate)' }}>
              {answered > 0 ? `${correct} of ${answered} answered correctly this session.` : "Here's how it went."}
            </p>
          </div>

          {summary.progress && <SessionProgressReveal progress={summary.progress} />}

          {hadCheckin && (
            <section style={{ marginTop: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.4rem' }}>How confident do you feel about this topic now? (0–10)</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={confidenceAfter === n ? 'btn btn--accent btn--small' : 'btn btn--ghost btn--small'}
                    aria-pressed={confidenceAfter === n}
                    onClick={() => saveConfidenceAfter(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {confidenceSaved && <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Saved. Thank you.</p>}
            </section>
          )}

          <SummarySection title="What you learned" items={summary.whatYouLearned} />
          <SummarySection title="What you can now do" items={summary.whatYouCanNowDo} />
          <SummarySection title="Still needs practice" items={summary.needsPractice} />

          <section style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.4rem' }}>Recommended next step</h2>
            <p style={{ color: 'var(--ink-soft)' }}>{summary.nextRecommendation.reason}</p>
          </section>

          <div className="hero__actions" style={{ marginTop: 'var(--space-4)' }}>
            <a href="/progress" className="btn btn--accent">
              View your progress
            </a>
            <a href="/learn" className="btn btn--ghost">
              Start another session
            </a>
            <a href="/dashboard" className="btn btn--ghost">
              Dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell learn-layout">
        <aside className="learn-sidebar">
          {context ? (
            <>
              <p className="learn-sidebar__eyebrow">{context.subjectName}</p>
              <p className="learn-sidebar__crumb">
                {context.chapterName}
                {context.topicName ? ` › ${context.topicName}` : ''}
              </p>
              <h2 className="learn-sidebar__skill">{context.skillName ?? 'This skill'}</h2>

              <div className="progress-bar" aria-label="Mastery for this skill">
                <div className="progress-bar__fill" style={{ width: `${Math.max(4, Math.min(100, context.masteryScore))}%` }} />
              </div>
              <p className="learn-sidebar__progress-label">{Math.round(context.masteryScore)}% mastered so far</p>
              {recoveryMode && <p className="learn-sidebar__session-stat">Let&apos;s start gently today — a shorter, easier warm-up first.</p>}

              {answered > 0 && (
                <p className="learn-sidebar__session-stat">
                  {correct}/{answered} correct this session
                </p>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--slate)' }}>Loading topic…</p>
          )}

          <a href="/diagnostic" className="btn btn--ghost btn--small" style={{ marginTop: 'var(--space-3)', width: '100%' }}>
            Take a diagnostic test
          </a>
        </aside>

        <div className="learn-main shell--narrow" style={{ padding: 0 }}>
          <div style={{ paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h1 style={{ fontSize: 'var(--step-2)' }}>Learning session</h1>
            <button onClick={endSession} className={plan?.finished ? 'btn btn--accent btn--small' : 'btn btn--ghost btn--small'} disabled={loading || ending || !sessionId}>
              {ending ? 'Finishing…' : 'End session'}
            </button>
          </div>

          {error && <p className="alert">{error}</p>}

          <div className="chat">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg--${m.role} fade-slide-in`}>
                <span className="chat-msg__role">{m.role === 'tutor' ? 'Tutor' : 'You'}</span>
                {m.diagram && <AnimatedDiagram url={m.diagram.url} caption={m.diagram.caption} level={animLevel} />}
                <MathText text={m.content} />
              </div>
            ))}
            {loading && messages.length > 0 && (
              <div className="chat-msg chat-msg--tutor">
                <span className="chat-msg__role">Tutor</span>
                <span className="typing-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {activeQuestion && <QuestionFigure url={activeQuestion.figureUrl} caption={activeQuestion.figureCaption} />}

          {activeQuestion?.questionType === 'mcq' && activeQuestion.options && (
            <div className="mcq-options" style={{ marginBottom: 'var(--space-2)' }}>
              {activeQuestion.options.map((opt) => (
                <label key={opt} className="mcq-option">
                  <input type="radio" name="mcq-answer" value={opt} checked={input === opt} onChange={() => setInput(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {plan?.target && !plan.finished && (
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: 'var(--slate)' }}>
              Today&apos;s plan: question {Math.min(plan.done + 1, plan.target)} of about {plan.target}
              {plan.finalQuestion ? ' — the last one' : ''}
              {plan.gentler ? ' · a gentler pace for the next few questions' : ''}
            </p>
          )}
          {plan?.finished && (
            <p className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>
              That was the last planned question for today. Press <strong>End session</strong> to see your summary.
            </p>
          )}

          {lastFeedback && <AnswerFeedback key={lastFeedback.n} correct={lastFeedback.correct} level={animLevel} />}

          <form onSubmit={send} className="composer">
            <input
              className="composer__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeQuestion ? 'Your answer…' : 'Type a message… (or "hint", "example", "easier")'}
              disabled={loading}
            />
            <button type="submit" className="btn btn--accent" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>

          <div className="session-controls">
            <button onClick={requestHint} className="btn btn--ghost btn--small" disabled={loading || !activeQuestion}>
              Hint
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummarySection({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section style={{ marginTop: 'var(--space-3)' }}>
      <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.4rem' }}>{title}</h2>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--ink-soft)' }}>
        {items.map((it, i) => (
          <li key={i} style={{ marginBottom: '0.3rem' }}>
            {it}
          </li>
        ))}
      </ul>
    </section>
  );
}
