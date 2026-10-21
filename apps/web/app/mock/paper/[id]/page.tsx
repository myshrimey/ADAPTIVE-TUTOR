'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MathText } from '@/components/MathText';
import { QuestionFigure } from '@/components/QuestionFigure';
import { REVIEW_STATUS_TEXT, type ReviewStatus } from '@adaptive-tutor/core';
import { UpgradeCta } from '@/components/commerce/UpgradeCta';
import { PrintButton } from '@/components/reports/PrintButton';

// Board-pattern paper that is PRINTED and written on paper (v46).
// Steps: 1 print or save as PDF  2 sit it on paper  3 type the objective answers  4 photograph the written pages  5 marks.
// The answer key is never on this page.

interface PQ { no: number; id: string; prompt: string; questionType: 'mcq' | 'short_answer' | 'numeric'; options: string[] | null; optionLabels?: string[] | null; figureUrl: string | null; figureCaption: string | null; marks: number }
interface Paper { id: string; subjectName: string; title: string; challenge: boolean; status: 'in_progress' | 'submitted'; durationMinutes: number; totalMarks: number; blueprintMarks: number; complete: boolean; issues: string[]; basis: string; sections: { id: string; name: string; marksPerQuestion: number; questions: PQ[] }[]; answers: Record<string, string> }
interface Report { autoScore: number; autoTotal: number; writtenScore: number; writtenTotalMarked: number; writtenTotalAll: number; waitingForTeacher: number; unreadable: number; pendingNotMarked: number; items: { questionNo: number; maxScore: number; score: number | null; status: string; feedback: string | null; teacherNote: string | null }[]; complete: boolean; note: string; reviewStatus?: string | null }
interface Consent { given: boolean; current: boolean; bankAvailable: boolean; bank: boolean }

const ERR: Record<string, string> = {
  consent_required: 'Please give the parent/guardian permission first.',
  file_too_big: 'That photo is too large. Please use a photo under 8 MB.',
  not_an_image: 'That file is not a photo (use JPG, PNG or WebP).',
  image_reading_unavailable: 'Reading handwriting is not available right now. Please try again later.',
  no_pages_uploaded: 'Please upload at least one page first.',
  plan_upgrade_required: 'Handwritten papers are part of the paid plans.',
  no_credits: 'You have no handwritten-evaluation credits left. You can buy a handwritten mock evaluation on the Plans page.',
  too_many_runs: 'This paper has already been read the allowed number of times.',
  handwriting_unreadable_response: 'The reading did not work this time. Please press the button again.',
};

export default function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [paper, setPaper] = useState<Paper | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [agree, setAgree] = useState(false);
  const [bank, setBank] = useState(false);
  const [pages, setPages] = useState<{ page_no: number }[]>([]);
  const [maxPages, setMaxPages] = useState(8);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPage, setUploadPage] = useState(1);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const loadAll = useCallback(async (examId: string) => {
    const r = await fetch(`/api/mock/${examId}/paper`).then((x) => x.json());
    if (r.error) { setErr(r.error === 'mock_not_found' ? 'This paper was not found.' : r.error); return; }
    setPaper(r.data); setAnswers(r.data.answers ?? {}); setSubmitted(r.data.status === 'submitted');
    fetch('/api/handwriting/consent').then((x) => x.json()).then((j) => j.data && setConsent(j.data));
    fetch(`/api/mock/${examId}/sheets`).then((x) => x.json()).then((j) => { if (j.data) { setPages(j.data.pages); setMaxPages(j.data.maxPages); setUploadPage(Math.min((j.data.pages?.length ?? 0) + 1, j.data.maxPages)); } });
    if (r.data.status === 'submitted') fetch(`/api/mock/${examId}/paper-report`).then((x) => x.json()).then((j) => j.data && setReport(j.data));
  }, []);
  useEffect(() => { if (id) loadAll(id); }, [id, loadAll]);

  const typed = (paper?.sections ?? []).flatMap((s) => s.questions).filter((q) => q.questionType !== 'short_answer');
  const written = (paper?.sections ?? []).flatMap((s) => s.questions).filter((q) => q.questionType === 'short_answer');

  async function submitTyped() {
    if (!window.confirm('Submit your typed answers? You cannot change them after this.')) return;
    setBusy('submit'); setMsg(null);
    const r = await fetch(`/api/mock/${id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) }).then((x) => x.json());
    setBusy('');
    if (r.error) return setMsg(ERR[r.error] ?? r.error);
    await loadAll(id);
  }
  async function giveConsent() {
    setBusy('consent');
    const r = await fetch('/api/handwriting/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agree: true, keepForBank: bank }) }).then((x) => x.json());
    setBusy('');
    if (r.error) return setMsg(ERR[r.error] ?? r.error);
    setConsent((c) => (c ? { ...c, given: true, current: true } : c));
  }
  async function upload(file: File) {
    setBusy('upload'); setMsg(null);
    const form = new FormData(); form.append('file', file); form.append('page', String(uploadPage));
    const r = await fetch(`/api/mock/${id}/sheets`, { method: 'POST', body: form }).then((x) => x.json());
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
    if (r.error) return setMsg(ERR[r.error] ?? r.error);
    if (!r.data.accepted) return setMsg(r.data.message);
    setMsg(`Page ${r.data.pageNo} saved.`);
    const j = await fetch(`/api/mock/${id}/sheets`).then((x) => x.json());
    if (j.data) { setPages(j.data.pages); setUploadPage(Math.min(j.data.pages.length + 1, j.data.maxPages)); }
  }
  async function removePage(n: number) {
    await fetch(`/api/mock/${id}/sheets?page=${n}`, { method: 'DELETE' });
    const j = await fetch(`/api/mock/${id}/sheets`).then((x) => x.json());
    if (j.data) setPages(j.data.pages);
  }
  async function evaluate() {
    setBusy('eval'); setMsg(null);
    const r = await fetch(`/api/mock/${id}/evaluate`, { method: 'POST' }).then((x) => x.json());
    setBusy('');
    if (r.error) return setMsg(ERR[r.error] ?? r.error);
    setMsg(`Done: ${r.data.marked} marked by AI, ${r.data.needsTeacher} sent to a teacher, ${r.data.unreadable} could not be read.`);
    fetch(`/api/mock/${id}/paper-report`).then((x) => x.json()).then((j) => j.data && setReport(j.data));
  }

  if (err) return <main className="page"><div className="shell"><p className="field__error">{err}</p><p><a href="/mock">Back to papers</a></p></div></main>;
  if (!paper) return <main className="page"><div className="shell"><p>Loading…</p></div></main>;

  return (
    <main className="page paper-page">
      <style>{`
        .paper-sheet { background:#fff; color:#000; max-width: 820px; margin: 0 auto; padding: 1.2rem 1.4rem; border:1px solid var(--line,#ddd); }
        .paper-sheet h2 { font-size: 1.05rem; margin: 1.2rem 0 .4rem; border-bottom: 1px solid #000; padding-bottom: .2rem; }
        .paper-q { margin: .7rem 0; break-inside: avoid; }
        .paper-lines { margin-top: .4rem; }
        .paper-lines div { border-bottom: 1px solid #999; height: 1.7rem; }
        @media print {
          .no-print, header, footer, nav { display: none !important; }
          .paper-sheet { border: none; padding: 0; max-width: none; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="shell no-print" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{paper.title}{paper.challenge ? ' · Challenge Mode' : ''}</h1>
        <ol style={{ color: 'var(--slate)', paddingLeft: '1.2rem' }}>
          <li><strong>Print the paper</strong> (button below; on the print screen choose &quot;Save as PDF&quot; if you want a PDF).</li>
          <li>Sit it on paper in {paper.durationMinutes} minutes. Write each answer on your own sheets and start with the question number.</li>
          <li>Type the answers to the multiple-choice and number questions below and submit.</li>
          <li>Photograph each written page and upload it. The AI reads it; a teacher checks anything uncertain.</li>
        </ol>
        {!paper.complete && paper.issues.length > 0 && <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Note: {paper.issues.join(' ')}</p>}
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{paper.basis}</p>
        <p><PrintButton fileName="sahayak-mock-paper" /> <a className="btn btn--ghost" href="/mock">Back</a></p>
      </div>

      <article className="paper-sheet" aria-label="Question paper">
        <div style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '1.2rem' }}>{paper.subjectName}</strong><br />
          <span>{paper.title}{paper.challenge ? ' (Challenge Mode)' : ''}</span><br />
          <span>Time: {paper.durationMinutes} minutes &nbsp;·&nbsp; Maximum marks: {paper.totalMarks}</span><br />
          <span style={{ fontSize: '0.8rem' }}>Practice paper made by Sahayak from a planning blueprint. It is not an official CBSE paper.</span>
        </div>
        {paper.sections.map((s) => (
          <section key={s.id}>
            <h2>{s.name} ({s.marksPerQuestion} mark{s.marksPerQuestion === 1 ? '' : 's'} each)</h2>
            {s.questions.map((q) => (
              <div className="paper-q" key={q.id}>
                <div><strong>{q.no}.</strong> <MathText text={q.prompt} /> <span style={{ float: 'right' }}>[{q.marks}]</span></div>
                {q.figureUrl && <QuestionFigure url={q.figureUrl} caption={q.figureCaption} />}
                {q.options && <ol type="A" style={{ margin: '.3rem 0 0 1.4rem' }}>{(q.optionLabels ?? q.options).map((o, i) => <li key={i}><MathText text={o} /></li>)}</ol>}
                {q.questionType === 'short_answer' && <div className="paper-lines">{Array.from({ length: Math.min(6, 2 + q.marks) }).map((_, i) => <div key={i} />)}</div>}
              </div>
            ))}
          </section>
        ))}
      </article>

      <div className="shell no-print" style={{ maxWidth: 820, paddingTop: 'var(--space-4)' }}>
        <h2>Step 3: type your objective answers</h2>
        {submitted ? <p>Submitted. {report && <>Auto-marked part: <strong>{report.autoScore} / {report.autoTotal}</strong>.</>}</p> : (
          <>
            {typed.map((q) => (
              <div key={q.id} style={{ margin: '0.5rem 0' }}>
                <strong>{q.no}.</strong>{' '}
                {q.questionType === 'mcq' && q.options ? q.options.map((o, i) => (
                  <label key={i} style={{ marginRight: 12 }}><input type="radio" name={`q${q.id}`} checked={answers[q.id] === o} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))} /> {String.fromCharCode(65 + i)}</label>
                )) : <input className="field__input" style={{ maxWidth: 200 }} value={answers[q.id] ?? ''} maxLength={200} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />}
              </div>
            ))}
            <p><button className="btn btn--accent" disabled={busy === 'submit'} onClick={submitTyped}>Submit typed answers</button></p>
          </>
        )}

        {submitted && written.length > 0 && (
          <>
            <h2>Step 4: photos of your written answers</h2>
            {!consent?.current ? (
              <div>
                <p>Photos of a child&apos;s handwriting are personal data. Please read and tick:</p>
                <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>I am the parent or guardian (or have their permission). Sahayak may store these photos privately, send them to an AI service to read and mark them, and show them to a Sahayak teacher (without the child&apos;s name) when a check is needed. I can download or delete them from My data.</span></label>
                {consent?.bankAvailable && <label style={{ display: 'flex', gap: 8, marginTop: 8 }}><input type="checkbox" checked={bank} onChange={(e) => setBank(e.target.checked)} /><span>Optional: if I later delete the account, Sahayak may keep the typed-out answer and its marks, with no name or contact details, to improve its question bank.</span></label>}
                <p><button className="btn btn--accent" disabled={!agree || busy === 'consent'} onClick={giveConsent}>I agree</button></p>
              </div>
            ) : (
              <div>
                <p>Take a clear photo of each page, in good light, with the whole page in the picture. This examination allows up to {maxPages} answer-sheet images.</p>
                <label>Page number <input type="number" min={1} max={maxPages} value={uploadPage} onChange={(e) => setUploadPage(Number(e.target.value))} style={{ width: 70, marginRight: 8 }} /></label>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy === 'upload'} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <ul>{pages.map((p) => <li key={p.page_no}>Page {p.page_no} saved <button className="btn btn--ghost" onClick={() => removePage(p.page_no)}>Remove</button></li>)}</ul>
                <p><button className="btn btn--accent" disabled={busy === 'eval' || pages.length === 0} onClick={evaluate}>{busy === 'eval' ? 'Reading… this can take a minute' : 'Read and mark my written answers'}</button></p>
              </div>
            )}
          </>
        )}
        {msg && <p role="status">{msg}</p>}

        {report && (
          <>
            <h2>Step 5: marks</h2>
            <p>Auto-marked: <strong>{report.autoScore} / {report.autoTotal}</strong>. Written (counted so far): <strong>{report.writtenScore} / {report.writtenTotalMarked}</strong> of {report.writtenTotalAll} written marks.</p>
            <p style={{ color: 'var(--slate)' }}>{report.note}</p>
            {report.reviewStatus && REVIEW_STATUS_TEXT[report.reviewStatus as ReviewStatus] && <p style={{ fontSize: '0.9rem' }}><strong>Review status:</strong> {report.reviewStatus.replace(/_/g, ' ').toLowerCase()} — {REVIEW_STATUS_TEXT[report.reviewStatus as ReviewStatus]}</p>}
            <UpgradeCta kind="mock" source="paper_result" />
            <ul>{report.items.map((it) => <li key={it.questionNo}>Q{it.questionNo}: {it.score === null ? (it.status === 'needs_teacher' ? 'waiting for a teacher' : it.status === 'unreadable' ? 'could not be read, please retake the photo' : 'not marked yet') : `${it.score} / ${it.maxScore}`}{it.feedback ? ` — ${it.feedback}` : ''}{it.teacherNote ? ` Teacher: ${it.teacherNote}` : ''}</li>)}</ul>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>These are practice marks. They do not change your learning progress and are not a prediction of board marks.</p>
          </>
        )}
      </div>
    </main>
  );
}
