'use client';
// v62: the student's personal learning path. Every step says why it is there. Class 10 steps open the normal lesson;
// earlier-class steps are practised here, and a step is marked done only after enough correct answers.
import { useEffect, useState } from 'react';
import { MathText } from '@/components/MathText';
import { AnswerInput, answerProblem } from '@/components/AnswerInput';

interface Node { seq: number; competencyId: string; name: string; classLevel: number; stage: string; reason: string; status: string; skillId: string | null; id?: string }
const STAGE: Record<string, string> = { prerequisite_repair: 'Build the foundation', foundation: 'Foundation', core: 'Core', application: 'Apply', reasoning: 'Reason it through' };

export default function PathPage() {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<(Node & { nodeId?: string })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [item, setItem] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(id: string) {
    const j = await (await fetch('/api/baseline/result?subjectId=' + id)).json();
    if (j.error) setError(j.error); else setNodes(j.data?.path ?? []);
  }
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('subjectId'); setSubjectId(id); if (id) load(id); }, []);

  async function practise(nodeId: string, body: any = {}) {
    setBusy(true); setMsg(null);
    try {
      const j = await (await fetch('/api/baseline/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeId, ...body }) })).json();
      if (j.error) throw new Error(j.error);
      const d = j.data;
      if (d.feedback?.formatProblem) { setMsg(d.feedback.formatProblem); setBusy(false); return; }
      if (d.feedback) setMsg(d.feedback.correct ? 'Correct.' : `Not quite. The answer is ${d.feedback.correctAnswer}.${d.feedback.explanation ? ' ' + d.feedback.explanation : ''}`);
      setActive(nodeId); setAnswer('');
      if (d.done) { setItem(null); setMsg('You have shown this skill. Moving on is a good idea.'); if (subjectId) await load(subjectId); }
      else setItem(d.item);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <p className="hero__eyebrow">Your learning path</p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Step by step to Class 10</h1>
      {error && <p className="alert">{error}</p>}
      {!subjectId && <p>Choose a subject on the <a href="/baseline">adaptive check</a> page first.</p>}
      {subjectId && nodes.length === 0 && !error && <p style={{ color: 'var(--slate)' }}>No path yet. <a href="/baseline">Take the adaptive check</a> to build one.</p>}
      <ol style={{ paddingLeft: '1.2rem' }}>
        {nodes.map((n) => (
          <li key={n.seq} style={{ marginBottom: '0.9rem', opacity: n.status === 'done' ? 0.6 : 1 }}>
            <strong>{n.name}</strong> {n.status === 'done' && <span>✓ done</span>}
            <div style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{STAGE[n.stage] ?? n.stage} · usually Class {n.classLevel}</div>
            <div style={{ fontSize: '0.9rem' }}>Why this step? {n.reason}</div>
            {n.status !== 'done' && (n.skillId
              ? <a className="btn btn--ghost" href="/learn" style={{ marginTop: '0.3rem' }}>Open the lesson</a>
              : <button className="btn btn--ghost" disabled={busy} style={{ marginTop: '0.3rem' }} onClick={() => practise((n as any).nodeId ?? (n as any).id ?? '')}>Practise this skill</button>)}
            {active && active === ((n as any).nodeId ?? (n as any).id) && item && (
              <form style={{ marginTop: '0.6rem' }} onSubmit={(e) => { e.preventDefault(); const bad = answerProblem(item.inputKind, item.questionType, answer); if (bad) { setMsg(bad); return; } practise(active, { itemTable: item.itemTable, itemId: item.itemId, answer }); }}>
                <div className="question-card">
                  <p className="question-card__prompt"><MathText text={item.prompt} /></p>
                  {item.questionType === 'mcq' && item.options ? <div className="mcq-options">{item.options.map((o: string) => <label key={o} className="mcq-option"><input type="radio" name="pa" checked={answer === o} onChange={() => setAnswer(o)} /><MathText text={o} /></label>)}</div>
                    : <AnswerInput value={answer} onChange={setAnswer} questionType={item.questionType} inputKind={item.inputKind} autoFocus />}
                </div>
                <button type="submit" className="btn btn--accent" disabled={busy}>Check</button>
              </form>)}
            {active && active === ((n as any).nodeId ?? (n as any).id) && msg && <p style={{ fontSize: '0.9rem' }}>{msg}</p>}
          </li>))}
      </ol>
    </div></main>
  );
}
