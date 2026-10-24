'use client';
// Upload a question or ask for questions. Used by teachers, tutors, coaching centres and the admin. Saved as "needs review" with the sender's name.
import { useEffect, useState } from 'react';

interface SubjectSkills { subjectId: string; subject: string; skills: Array<{ id: string; name: string }> }

export function QuestionContribute({ endpointUpload = '/api/contribute/question', admin = false }: { endpointUpload?: string; admin?: boolean }) {
  const [data, setData] = useState<SubjectSkills[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [f, setF] = useState({ skillId: '', bank: 'practice', questionType: 'mcq', prompt: '', o1: '', o2: '', o3: '', o4: '', answer: '', explanation: '', difficulty: '3', markVerified: false, tier: 'core', examStyle: 'olympiad', stretchLevel: '2' });
  const [rq, setRq] = useState({ skillId: '', topicText: '', wantedCount: '10', note: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [rmsg, setRmsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/contribute/skills').then((r) => r.json()).then((j) => { setData(j.data ?? []); if (j.data?.[0]) setSubjectId(j.data[0].subjectId); }); }, []);
  const skills = data.find((d) => d.subjectId === subjectId)?.skills ?? [];
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const options = f.questionType === 'mcq' ? [f.o1, f.o2, f.o3, f.o4].filter((x) => x.trim()) : undefined;
    const question = { skillId: f.skillId, bank: f.bank, questionType: f.questionType, prompt: f.prompt, options, answer: f.answer, explanation: f.explanation, difficulty: Number(f.difficulty), ...(f.tier === 'stretch' ? { tier: 'stretch', examStyle: f.examStyle, stretchLevel: Number(f.stretchLevel) } : {}), markVerified: admin && f.markVerified };
    const res = await fetch(admin ? '/api/admin/question-register' : endpointUpload, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(admin ? { action: 'upload', question } : question) });
    const j = await res.json();
    setBusy(false);
    if (j.error) { setMsg(j.error); return; }
    setMsg(admin && f.markVerified ? 'Saved as verified.' : 'Saved. It will be used after it is reviewed.');
    setF((p) => ({ ...p, prompt: '', o1: '', o2: '', o3: '', o4: '', answer: '', explanation: '' }));
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setRmsg(null);
    const res = await fetch('/api/contribute/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: rq.skillId ? undefined : subjectId, skillId: rq.skillId || undefined, topicText: rq.topicText, wantedCount: Number(rq.wantedCount), note: rq.note }) });
    const j = await res.json();
    setBusy(false);
    setRmsg(j.error ? j.error : 'Request sent. The founder will see it and arrange the questions.');
  }
  const box: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid var(--line)', borderRadius: 6, font: 'inherit', marginBottom: '0.5rem' };
  return (
    <div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Add a question</h2>
      <form onSubmit={send}>
        <label>Subject <select style={box} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); set('skillId', ''); }}>{data.map((d) => <option key={d.subjectId} value={d.subjectId}>{d.subject}</option>)}</select></label>
        <label>Skill <select style={box} required value={f.skillId} onChange={(e) => set('skillId', e.target.value)}><option value="">Choose a skill</option>{skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <label>Type <select style={box} value={f.questionType} onChange={(e) => set('questionType', e.target.value)}><option value="mcq">Multiple choice</option><option value="numeric">Number</option><option value="short_answer">Short answer</option></select></label>
          <label>Difficulty (1 easy – 5 hard) <select style={box} value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Use in <select style={box} value={f.bank} onChange={(e) => set('bank', e.target.value)}><option value="practice">Practice, quiz, mock</option><option value="diagnostic">Diagnostic</option></select></label>
        </div>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}><input type="checkbox" checked={f.tier === 'stretch'} onChange={(e) => set('tier', e.target.checked ? 'stretch' : 'core')} /> This is a Challenge-zone question (olympiad / competitive-exam style, for strong students; it will not appear in ordinary quizzes). It must be your own original question, not copied from a real paper.</label>
        {f.tier === 'stretch' && <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <label>Exam style <select style={box} value={f.examStyle} onChange={(e) => set('examStyle', e.target.value)}><option value="olympiad">Olympiad</option><option value="ntse">NTSE</option><option value="ioqm">Maths Olympiad (IOQM)</option><option value="jee_foundation">JEE foundation</option><option value="neet_foundation">NEET foundation</option><option value="general_challenge">General challenge</option></select></label>
          <label>Level <select style={box} value={f.stretchLevel} onChange={(e) => set('stretchLevel', e.target.value)}><option value="1">1 Bridge</option><option value="2">2 Challenge</option><option value="3">3 Summit</option></select></label>
        </div>}
        <label>Question <textarea style={box} required rows={3} value={f.prompt} onChange={(e) => set('prompt', e.target.value)} /></label>
        {f.questionType === 'mcq' && <>{(['o1', 'o2', 'o3', 'o4'] as const).map((k, i) => <input key={k} style={box} placeholder={`Option ${i + 1}${i < 3 ? '' : ' (optional)'}`} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} />)}</>}
        <label>Correct answer {f.questionType === 'mcq' && '(write it exactly like one option)'} <input style={box} required value={f.answer} onChange={(e) => set('answer', e.target.value)} /></label>
        <label>Explanation (optional) <textarea style={box} rows={2} value={f.explanation} onChange={(e) => set('explanation', e.target.value)} /></label>
        {admin && <label style={{ display: 'block', marginBottom: '0.5rem' }}><input type="checkbox" checked={f.markVerified} onChange={(e) => set('markVerified', e.target.checked)} /> I have checked this question and its answer (mark as verified)</label>}
        <button className="btn btn--accent" disabled={busy}>Save question</button>
        {msg && <p role="status">{msg}</p>}
      </form>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Ask for questions</h2>
      <p style={{ color: 'var(--slate)' }}>Need more practice questions on a skill or topic? Tell us. Your request is recorded with your name.</p>
      <form onSubmit={ask}>
        <label>Skill (optional) <select style={box} value={rq.skillId} onChange={(e) => setRq((p) => ({ ...p, skillId: e.target.value }))}><option value="">Whole subject / describe below</option>{skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Topic in your words (optional) <input style={box} value={rq.topicText} onChange={(e) => setRq((p) => ({ ...p, topicText: e.target.value }))} /></label>
        <label>How many <input style={box} type="number" min={1} max={200} value={rq.wantedCount} onChange={(e) => setRq((p) => ({ ...p, wantedCount: e.target.value }))} /></label>
        <label>Note (optional) <input style={box} value={rq.note} onChange={(e) => setRq((p) => ({ ...p, note: e.target.value }))} /></label>
        <button className="btn btn--ghost" disabled={busy}>Send request</button>
        {rmsg && <p role="status">{rmsg}</p>}
      </form>
    </div>
  );
}
