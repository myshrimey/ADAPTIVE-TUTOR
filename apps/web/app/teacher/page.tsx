'use client';

import { ReferralPanel } from '@/components/ReferralPanel';
import { useCallback, useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';
import { QuestionFigure } from '@/components/QuestionFigure';

interface Item {
  id: string;
  table: 'questions' | 'diagnostic_questions';
  chapter: string;
  skill: string;
  difficulty: number;
  questionType: string;
  prompt: string;
  options: string[] | null;
  expectedAnswer: string;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
  source: string;
  marks: number | null;
  cognitiveLevel: string | null;
  expectedTimeSeconds: number | null;
}
interface Stats { total: number; last30Days: number; approve: number; needsFix: number; reject: number }

// The teacher's review area: AI/bank questions waiting for a human check. A teacher gives
// feedback (looks correct / needs a fix / reject, with a comment and an optional corrected
// answer). The founder applies it; nothing here changes what students see by itself.
export default function TeacherPage() {
  const [me, setMe] = useState<{ displayName: string; status: string } | null | 'none'>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string; status: string }[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [bank, setBank] = useState<'diagnostic' | 'practice'>('diagnostic');
  const [onlyGenerated, setOnlyGenerated] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [comment, setComment] = useState('');
  const [sugAnswer, setSugAnswer] = useState('');
  const [sugExpl, setSugExpl] = useState('');
  const [sugMarks, setSugMarks] = useState('');
  const [sugLevel, setSugLevel] = useState('');
  const [mode, setMode] = useState<'idle' | 'needs_fix' | 'reject'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/teacher/me').then((r) => r.json()).then((j) => setMe(j.error ? 'none' : j.data)).catch(() => setMe('none'));
  }, []);

  const loadStats = useCallback(() => {
    fetch('/api/teacher/stats').then((r) => r.json()).then((j) => { if (!j.error) setStats(j.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (me && me !== 'none' && me.status === 'approved') {
      loadStats();
      fetch('/api/teacher/subjects').then((r) => r.json()).then((j) => {
        if (!j.error) {
          setSubjects(j.data);
          if (j.data[0]) setSubjectId(j.data[0].id);
        }
      });
    }
  }, [me, loadStats]);

  const loadQueue = useCallback(async (from: number, replace: boolean) => {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/teacher/queue?subjectId=${subjectId}&bank=${bank}&source=${onlyGenerated ? 'generated' : 'all'}&offset=${from}`);
    const json = await res.json();
    setLoading(false);
    if (json.error) return setError(json.error);
    setItems((prev) => (replace ? json.data.items : [...prev, ...json.data.items]));
    setOffset(json.data.nextOffset);
    setExhausted(!!json.data.exhausted);
  }, [subjectId, bank, onlyGenerated]);

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setExhausted(false);
    if (subjectId) loadQueue(0, true);
  }, [subjectId, bank, onlyGenerated, loadQueue]);

  const current = items[0];

  async function submit(verdict: 'approve' | 'needs_fix' | 'reject') {
    if (!current) return;
    if (verdict !== 'approve' && !comment.trim()) {
      setError('Please write a short comment so we know what to fix.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/teacher/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: current.table, itemId: current.id, verdict, comment, suggestedAnswer: sugAnswer, suggestedExplanation: sugExpl, suggestedMarks: sugMarks, suggestedCognitiveLevel: sugLevel }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.error) return setError(json.error === 'comment_required' ? 'Please write a short comment.' : json.error);
    setComment('');
    setSugAnswer('');
    setSugExpl('');
    setSugMarks('');
    setSugLevel('');
    setMode('idle');
    setItems((prev) => prev.slice(1));
    loadStats();
    if (items.length <= 1 && !exhausted) loadQueue(offset, false);
  }

  if (me === null) return <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>Loading…</div></main>;
  if (me === 'none') {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Teacher area</h1>
          <p>This area is for approved teachers. <a href="/">Sign in</a> with your teacher account, or <a href="/teacher/register">register as a teacher</a>.</p>
        </div>
      </main>
    );
  }
  if (me.status !== 'approved') {
    return (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Hello, {me.displayName}</h1>
          <p>{me.status === 'suspended' ? 'Your teacher access is currently paused. Please contact the Sahayak team.' : 'Your registration is waiting for approval by the Sahayak team. You will be able to start reviewing once it is approved.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Question review</h1>
          <p><a href="/teacher/handwriting">Check handwritten answers</a> · <a href="/teacher/questions">Add questions or ask for questions</a></p>
          <ReferralPanel compact />
          <p style={{ color: 'var(--slate)' }}>
            Hello, {me.displayName}. Check each question, its answer and its explanation. Your feedback helps decide what students see; nothing you do here changes a question by itself.
          </p>
          {stats && (
            <p style={{ fontSize: '0.9rem' }}>
              Your reviews: <strong>{stats.total}</strong> in total, <strong>{stats.last30Days}</strong> in the last 30 days ({stats.approve} correct, {stats.needsFix} needing a fix, {stats.reject} rejected).
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
          <select className="field__input" style={{ maxWidth: 260 }} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Subject">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="field__input" style={{ maxWidth: 260 }} value={bank} onChange={(e) => setBank(e.target.value as any)} aria-label="Question set">
            <option value="diagnostic">Diagnostic and quiz questions</option>
            <option value="practice">Learning-session practice questions</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="checkbox" checked={onlyGenerated} onChange={(e) => setOnlyGenerated(e.target.checked)} /> Only AI-generated
          </label>
        </div>

        {error && <p className="alert">{error}</p>}
        {loading && !current && <p>Loading questions…</p>}
        {!loading && !current && <p>Nothing left to review here right now. Thank you!</p>}

        {current && (
          <article className="chapter-row" style={{ display: 'block' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
              {current.chapter} › {current.skill} · difficulty {current.difficulty}/5 · {current.questionType} · {current.source === 'generated' ? 'AI-generated' : 'from question bank'}
            </div>
            <QuestionFigure url={current.figureUrl} caption={current.figureCaption} />
            <p style={{ fontSize: 'var(--step-1)' }}><MathText text={current.prompt} /></p>
            {current.options && (
              <ul>{current.options.map((o) => <li key={o}><MathText text={o} /></li>)}</ul>
            )}
            <p><strong>Answer key:</strong> <MathText text={current.expectedAnswer} /></p>
            <p><strong>Explanation:</strong> {current.explanation ? <MathText text={current.explanation} /> : <em>none written yet</em>}</p>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', margin: '0.4rem 0', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--slate)' }}>
                Marks: {current.marks ?? 'not set'} · Level: {current.cognitiveLevel ?? 'not set'} · Planning time: {current.expectedTimeSeconds ? `${current.expectedTimeSeconds}s` : 'not set'}
              </span>
              <label>Suggest marks{' '}
                <input className="field__input" style={{ width: 70, display: 'inline-block' }} type="number" min={1} max={20} value={sugMarks} onChange={(e) => setSugMarks(e.target.value)} />
              </label>
              <label>Suggest level{' '}
                <select className="field__input" style={{ width: 150, display: 'inline-block' }} value={sugLevel} onChange={(e) => setSugLevel(e.target.value)}>
                  <option value="">no suggestion</option>
                  <option value="recall">recall</option>
                  <option value="understand">understand</option>
                  <option value="apply">apply</option>
                  <option value="analyse">analyse</option>
                </select>
              </label>
            </div>

            {mode !== 'idle' && (
              <div style={{ marginTop: '0.6rem' }}>
                <div className="field">
                  <label className="field__label">{mode === 'reject' ? 'What is wrong or unsuitable? (required)' : 'What needs fixing? (required)'}</label>
                  <textarea className="field__input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
                </div>
                {mode === 'needs_fix' && (
                  <>
                    <div className="field">
                      <label className="field__label">Correct answer, if the key is wrong (optional)</label>
                      <input className="field__input" value={sugAnswer} onChange={(e) => setSugAnswer(e.target.value)} maxLength={500} />
                    </div>
                    <div className="field">
                      <label className="field__label">Better explanation (optional)</label>
                      <textarea className="field__input" rows={3} value={sugExpl} onChange={(e) => setSugExpl(e.target.value)} maxLength={2000} />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="hero__actions" style={{ marginTop: '0.8rem' }}>
              {mode === 'idle' ? (
                <>
                  <button className="btn btn--accent" disabled={busy} onClick={() => submit('approve')}>Looks correct</button>
                  <button className="btn btn--ghost" disabled={busy} onClick={() => setMode('needs_fix')}>Needs a fix</button>
                  <button className="btn btn--ghost" disabled={busy} onClick={() => setMode('reject')}>Reject</button>
                </>
              ) : (
                <>
                  <button className="btn btn--accent" disabled={busy} onClick={() => submit(mode)}>Send feedback</button>
                  <button className="btn btn--ghost" disabled={busy} onClick={() => { setMode('idle'); setError(null); }}>Back</button>
                </>
              )}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
