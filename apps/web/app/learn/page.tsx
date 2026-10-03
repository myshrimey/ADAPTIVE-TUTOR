'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  role: 'tutor' | 'student';
  content: string;
}

interface ActiveQuestion {
  id: string;
  prompt: string;
  questionType: string;
  options?: string[];
}

export default function LearnPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/session/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSessionId(json.data.sessionId);
        setMessages([{ role: 'tutor', content: json.data.turn.tutorMessage }]);
        setActiveQuestion(json.data.turn.activeQuestion ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !input.trim()) return;
    const text = input;
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
      setError(json.error);
      return;
    }
    setMessages((m) => [...m, { role: 'tutor', content: json.data.tutorMessage }]);
    setActiveQuestion(json.data.activeQuestion ?? null);
  }

  async function requestHint() {
    if (!sessionId) return;
    setLoading(true);
    const res = await fetch('/api/session/hint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    const json = await res.json();
    setLoading(false);
    if (json.error) return setError(json.error);
    setMessages((m) => [...m, { role: 'tutor', content: json.data.tutorMessage }]);
  }

  async function endSession() {
    if (!sessionId) return;
    setLoading(true);
    const res = await fetch('/api/session/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    const json = await res.json();
    setLoading(false);
    if (json.error) return setError(json.error);
    window.location.href = '/dashboard';
  }

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Learning session</h1>
          <button onClick={endSession} className="btn btn--ghost btn--small" disabled={loading || !sessionId}>
            End session
          </button>
        </div>

        {error && <p className="alert">{error}</p>}

        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              <span className="chat-msg__role">{m.role === 'tutor' ? 'Tutor' : 'You'}</span>
              {m.content}
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
