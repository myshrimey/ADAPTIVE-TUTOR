'use client';

import { useEffect, useState } from 'react';

// Teacher check of handwritten answers the AI was unsure about (or picked as a sample). No student name or email is shown.
interface QItem { id: string; questionNo: number; maxScore: number; confidence: string; subject: string }
interface Detail { id: string; subject: string; questionNo: number; prompt: string; answerKey: string; explanation: string | null; maxScore: number; aiScore: number | null; confidence: string; aiReading: string | null; aiFeedback: string | null; pages: { pageNo: number; url: string }[] }

export default function TeacherHandwriting() {
  const [queue, setQueue] = useState<QItem[] | null>(null);
  const [item, setItem] = useState<Detail | null>(null);
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function loadQueue() {
    const r = await fetch('/api/teacher/handwriting').then((x) => x.json());
    if (r.error) return setMsg(r.error === 'unauthenticated' || r.error === 'not_a_teacher' || r.error === 'teacher_not_approved' ? 'Only approved teachers can open this page.' : r.error);
    setQueue(r.data.items);
  }
  useEffect(() => { loadQueue(); }, []);
  async function open(id: string) {
    setMsg(null); setScore(''); setNote('');
    const r = await fetch(`/api/teacher/handwriting/${id}`).then((x) => x.json());
    if (r.error) return setMsg(r.error);
    setItem(r.data);
  }
  async function save() {
    if (!item) return;
    const r = await fetch(`/api/teacher/handwriting/${item.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: Number(score), note }) }).then((x) => x.json());
    if (r.error) return setMsg(r.error === 'bad_score' ? `Marks must be a whole number from 0 to ${item.maxScore}.` : r.error);
    setItem(null); setMsg('Saved. Thank you.'); loadQueue();
  }

  return (
    <main className="page"><div className="shell" style={{ maxWidth: 900, paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-3)' }}>Handwritten answers to check</h1>
      <p><a href="/teacher">Back to question review</a></p>
      {msg && <p role="status">{msg}</p>}
      {!item && (queue === null ? <p>Loading…</p> : queue.length === 0 ? <p>Nothing waiting.</p> : (
        <ul>{queue.map((q) => <li key={q.id}>{q.subject} · question {q.questionNo} · {q.maxScore} marks · AI confidence {q.confidence} <button className="btn btn--ghost" onClick={() => open(q.id)}>Check</button></li>)}</ul>
      ))}
      {item && (
        <div>
          <h2>{item.subject}, question {item.questionNo} ({item.maxScore} marks)</h2>
          <p><strong>Question:</strong> {item.prompt}</p>
          <p><strong>Answer key:</strong> {item.answerKey}{item.explanation ? ` — ${item.explanation}` : ''}</p>
          <p><strong>AI&apos;s reading of the answer:</strong> {item.aiReading ?? '(none)'}</p>
          <p><strong>AI suggestion:</strong> {item.aiScore ?? '?'} / {item.maxScore} (confidence {item.confidence}). {item.aiFeedback}</p>
          <p>The student&apos;s pages (links last 10 minutes):</p>
          {item.pages.map((p) => <p key={p.pageNo}><a href={p.url} target="_blank" rel="noreferrer">Page {p.pageNo}</a><br /><img src={p.url} alt={`Answer page ${p.pageNo}`} style={{ maxWidth: '100%', border: '1px solid var(--line)' }} /></p>)}
          <div className="field"><label className="field__label" htmlFor="sc">Your marks (0 to {item.maxScore})</label><input id="sc" className="field__input" style={{ maxWidth: 120 }} value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" /></div>
          <div className="field"><label className="field__label" htmlFor="nt">Short note for the student (optional)</label><textarea id="nt" className="field__input" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <p><button className="btn btn--accent" onClick={save} disabled={score === ''}>Save marks</button> <button className="btn btn--ghost" onClick={() => setItem(null)}>Cancel</button></p>
        </div>
      )}
    </div></main>
  );
}
