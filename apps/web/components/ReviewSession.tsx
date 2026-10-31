'use client';
import { useEffect, useState } from 'react';
import { ReportQuestion } from '@/components/ReportQuestion';
import { CONFIDENCE_LEVELS, immediateNote } from '@adaptive-tutor/core/calibration/calibration';

type Item = { itemTable: string; itemId: string; prompt: string; questionType: string; options: string[] | null; figureUrl?: string | null };
export function ReviewSession({ plan, hi, mixed = false }: { plan: any; hi: boolean; mixed?: boolean }) {
  const queue: { competencyId: string; name: string }[] = mixed ? plan.extra : plan.daily;
  const [i, setI] = useState(0);
  const [item, setItem] = useState<Item | null>(null);
  const [val, setVal] = useState('');
  const [conf, setConf] = useState<number | null>(null);
  const [fb, setFb] = useState<any>(null);
  const [right, setRight] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const cur = queue[i];
  const T = (en: string, h: string) => (hi ? h : en);

  async function call(body: any) { const r = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
  async function load(idx: number) {
    setFb(null); setVal(''); setConf(null); setItem(null); setMsg(null);
    if (!queue[idx]) return;
    const j = await call({ competencyId: queue[idx].competencyId });
    if (j.error) { setMsg(j.error); return; }
    if (!j.data.item) { setMsg(T('No new question for this skill right now.', 'इस कौशल के लिए अभी कोई नया प्रश्न नहीं है।')); return; }
    setItem(j.data.item);
  }
  useEffect(() => { if (started) load(i); /* eslint-disable-next-line */ }, [i, started]);
  async function submit() {
    if (!item) return;
    const j = await call({ competencyId: cur.competencyId, answer: { itemTable: item.itemTable, itemId: item.itemId, answer: val }, confidence: conf ?? undefined, mixed });
    if (j.error) { setMsg(j.error); return; }
    if (j.data.feedback?.formatProblem) { setMsg(j.data.feedback.formatProblem); return; }
    setMsg(null); setFb(j.data.feedback); if (j.data.feedback?.correct) setRight((r) => r + 1);
  }
  if (queue.length === 0) return null;
  if (!started) return <button className="btn btn--accent" onClick={() => setStarted(true)}>{mixed ? T(`Start mixed practice (${queue.length} questions from different topics)`, `मिली-जुली प्रैक्टिस शुरू करें (अलग-अलग विषयों के ${queue.length} प्रश्न)`) : T(`Start (${queue.length} short questions, about ${plan.minutes} minutes)`, `शुरू करें (${queue.length} छोटे प्रश्न, लगभग ${plan.minutes} मिनट)`)}</button>;
  if (i >= queue.length) return <div className="tip-card"><p className="tip-card__body"><strong>{T('Review done.', 'पुनरावृत्ति पूरी।')}</strong> {T(`${right} of ${queue.length} right. Skills you missed will come back sooner; the others will wait longer.`, `${queue.length} में से ${right} सही। जो छूटे वे जल्दी लौटेंगे; बाकी बाद में।`)}</p></div>;
  return (
    <div className="tip-card">
      <span className="tip-card__eyebrow">{i + 1} / {queue.length} · {cur.name}</span>
      {msg && <p role="status" className="alert">{msg}</p>}
      {item && (
        <>
          <p className="tip-card__body">{item.prompt}</p>
          <ReportQuestion id={item.itemId} hi={hi} />
          {item.figureUrl && <img src={item.figureUrl} alt="" style={{ maxWidth: '100%' }} />}
          {!fb && (item.options ? item.options.map((o) => <label key={o} style={{ display: 'block', margin: '0.3rem 0' }}><input type="radio" name="o" checked={val === o} onChange={() => setVal(o)} /> {o}</label>) : <input value={val} onChange={(e) => setVal(e.target.value)} style={{ padding: '0.5rem', width: '100%', maxWidth: 360 }} aria-label={T('Your answer', 'आपका उत्तर')} />)}
          {!fb && (
            <fieldset style={{ border: 0, padding: 0, margin: '0.6rem 0' }}>
              <legend style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>{T('How sure are you? (optional)', 'आप कितने आश्वस्त हैं? (वैकल्पिक)')}</legend>
              {CONFIDENCE_LEVELS.map((c) => <button key={c.value} type="button" aria-pressed={conf === c.value} className={conf === c.value ? 'btn btn--accent' : 'btn btn--ghost'} style={{ marginRight: '0.4rem', marginTop: '0.3rem' }} onClick={() => setConf(conf === c.value ? null : c.value)}>{hi ? c.hi : c.en}</button>)}
            </fieldset>
          )}
          {!fb && <p><button className="btn btn--accent" disabled={!val.trim()} onClick={submit}>{T('Check', 'जाँचें')}</button></p>}
        </>
      )}
      {fb && (
        <div>
          <p><strong>{fb.correct ? T('Right.', 'सही।') : T('Not this time.', 'इस बार नहीं।')}</strong> {!fb.correct && <>{T('Answer: ', 'उत्तर: ')}{fb.correctAnswer}</>}</p>
          {immediateNote(conf, !!fb.correct, hi) && <p role="status" style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>{immediateNote(conf, !!fb.correct, hi)}</p>}
          {fb.explanation && <p style={{ fontSize: '0.9rem' }}>{fb.explanation}</p>}
          <button className="btn btn--accent" onClick={() => setI(i + 1)}>{i + 1 < queue.length ? T('Next', 'अगला') : T('Finish', 'पूरा करें')}</button>
        </div>
      )}
      {!item && !fb && msg && <p><button className="btn btn--ghost" onClick={() => setI(i + 1)}>{T('Skip', 'छोड़ें')}</button></p>}
    </div>
  );
}
