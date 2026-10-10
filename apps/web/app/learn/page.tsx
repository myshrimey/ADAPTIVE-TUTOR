'use client';

import { useEffect, useRef, useState } from 'react';
import { MathText } from '@/components/MathText';

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
}

interface SessionSummary {
  whatYouLearned: string[];
  whatYouCanNowDo: string[];
  needsPractice: string[];
  nextRecommendation: { skillId: string | null; reason: string };
}

// The API returns internal error codes (gemini_request_timeout,
// gemini_request_failed: 404 ..., etc.) meant for logs/debugging, not a
// student's screen. This translates the ones worth explaining differently;
// anything unmatched just shows as-is rather than hiding a real signal.
function friendlyError(raw: string): string {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live progress, tracked client-side from each answer turn's evaluation —
  // no extra backend call needed, just a running count of what's already
  // come back from /api/session/answer.
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);

  // Set once the session is actually closed — switches the whole page over
  // to the summary view instead of silently redirecting to /dashboard with
  // nothing shown. completeSession() (packages/core) already computes this;
  // it was just being thrown away before.
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    fetch('/api/session/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSessionId(json.data.sessionId);
        setMessages([{ role: 'tutor', content: json.data.turn.tutorMessage, diagram: json.data.turn.diagram ?? null }]);
        setActiveQuestion(json.data.turn.activeQuestion ?? null);
      })
      .catch((e) => setError(friendlyError(e.message)))
      .finally(() => setLoading(false));
  }, []);

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
    }
    setMessages((m) => [...m, { role: 'tutor', content: json.data.tutorMessage, diagram: json.data.diagram ?? null }]);
    setActiveQuestion(json.data.activeQuestion ?? null);
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
    setSummary(json.data);
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

          <SummarySection title="What you learned" items={summary.whatYouLearned} />
          <SummarySection title="What you can now do" items={summary.whatYouCanNowDo} />
          <SummarySection title="Still needs practice" items={summary.needsPractice} />

          <section style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.4rem' }}>Recommended next step</h2>
            <p style={{ color: 'var(--ink-soft)' }}>{summary.nextRecommendation.reason}</p>
          </section>

          <div className="hero__actions" style={{ marginTop: 'var(--space-4)' }}>
            <a href="/dashboard" className="btn btn--accent">
              Go to dashboard
            </a>
            <a href="/learn" className="btn btn--ghost">
              Start another session
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Learning session</h1>
          <button onClick={endSession} className="btn btn--ghost btn--small" disabled={loading || ending || !sessionId}>
            {ending ? 'Finishing…' : 'End session'}
          </button>
        </div>

        {answered > 0 && (
          <p style={{ color: 'var(--slate)', fontSize: '0.85rem', marginTop: '-0.3rem', marginBottom: 'var(--space-1)' }}>
            {answered} answered this session · {correct} correct
          </p>
        )}

        {error && <p className="alert">{error}</p>}

        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              <span className="chat-msg__role">{m.role === 'tutor' ? 'Tutor' : 'You'}</span>
              {m.diagram && (
                <img
                  src={m.diagram.url}
                  alt={m.diagram.caption}
                  style={{ maxWidth: '100%', maxHeight: '260px', display: 'block', margin: '0.4rem 0 0.6rem', borderRadius: '8px', border: '1px solid var(--line)' }}
                />
              )}
              <MathText text={m.content} />
            </div>
          ))}
          {loading && messages.length > 0 && (
            <div className="chat-msg chat-msg--tutor">
              <span className="chat-msg__role">Tutor</span>
              …
            </div>
          )}
          <div ref={bottomRef} />
        </div>

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
