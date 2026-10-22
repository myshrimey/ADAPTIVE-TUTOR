'use client';
import { useState } from 'react';
import type { ReviewItem } from '@adaptive-tutor/core';

export function TranslationReview({ items, subjectId }: { items: ReviewItem[]; subjectId: string }) {
  const [done, setDone] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('');
  async function act(questionId: string, status: string) { const r = await (await fetch('/api/admin/translations/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check', questionId, status }) })).json(); setDone((d) => ({ ...d, [questionId]: r.error ? `Not saved: ${r.error}` : status === 'teacher_checked' ? 'Marked as checked' : 'Rejected' })); }
  async function reval() { setMsg('Re-running automatic checks…'); const r = await (await fetch('/api/admin/translations/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revalidate', subjectId }) })).json(); setMsg(r.error ?? `Checked ${r.data.checked}: ${r.data.passed} passed, ${r.data.failed} failed (failed ones are no longer shown to students).`); }
  return (
    <div>
      <p><button className="btn btn--ghost btn--small" onClick={reval}>Re-run automatic checks for this subject</button> <span style={{ fontSize: '0.9rem' }}>{msg}</span></p>
      {items.length === 0 && <p>Nothing waiting to be checked for this subject.</p>}
      {items.map((it) => (
        <div key={it.questionId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.8rem' }}>
            <div><strong>English</strong><p style={{ margin: '0.2rem 0' }}>{it.english.prompt}</p>{it.english.options && <ol type="A" style={{ margin: 0, paddingLeft: '1.2rem' }}>{it.english.options.map((o, i) => <li key={i}>{o}</li>)}</ol>}{it.english.answer && <p style={{ fontSize: '0.85rem' }}>Answer: {it.english.answer}</p>}</div>
            <div><strong>हिंदी</strong><p style={{ margin: '0.2rem 0' }}>{it.translated.prompt}</p>{it.translated.options && <ol type="A" style={{ margin: 0, paddingLeft: '1.2rem' }}>{it.translated.options.map((o, i) => <li key={i}>{o}</li>)}</ol>}{it.translated.answer && <p style={{ fontSize: '0.85rem' }}>उत्तर: {it.translated.answer}</p>}</div>
          </div>
          {it.failed.length > 0 && <p className="alert">Automatic checks failed: {it.failed.join(', ')}</p>}
          {done[it.questionId] ? <p><strong>{done[it.questionId]}</strong></p> : (
            <p><button className="btn btn--accent btn--small" onClick={() => act(it.questionId, 'teacher_checked')}>Correct: mark as checked</button> <button className="btn btn--ghost btn--small" onClick={() => act(it.questionId, 'rejected')}>Wrong: reject (English is shown instead)</button></p>
          )}
        </div>
      ))}
    </div>
  );
}
