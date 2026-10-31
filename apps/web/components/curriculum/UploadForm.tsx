'use client';
import { useState } from 'react';
import { DOC_TYPES, DOC_TYPE_LABEL } from '@adaptive-tutor/core/curriculum-mgmt/constants';
export function UploadForm() {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/curriculum', { method: 'POST', body: new FormData(e.currentTarget) }).then((x) => x.json());
      if (r.error) setMsg({ ok: false, text: r.error === 'not_authorized' ? 'You do not have permission.' : r.error });
      else { setMsg({ ok: true, text: r.data.note }); setTimeout(() => (location.href = '/admin/curriculum/' + r.data.versionId), 900); }
    } catch { setMsg({ ok: false, text: 'Could not reach the server.' }); }
    setBusy(false);
  }
  const F = ({ id, label, ...p }: any) => <div className="field"><label className="field__label" htmlFor={id}>{label}</label><input id={id} name={id} className="field__input" {...p} /></div>;
  return (
    <form onSubmit={submit} className="chapter-row" style={{ display: 'block' }}>
      <h2 style={{ marginTop: 0 }}>Upload a syllabus document</h2>
      <p style={{ color: 'var(--slate)', marginTop: 0 }}>PDF, DOCX, XLSX or CSV, up to 4 MB. It becomes a NEW draft version and never replaces the published one. A PDF is kept as the source and its text is read automatically: only lines that start with Unit, Chapter, Topic, Learning outcome or Assessment objective become items, each with its PDF page. A scanned PDF (pictures of pages) cannot be read: paste the outline or use the CSV template. Always check what was read.</p>
      <F id="board" label="Board" defaultValue="CBSE" required /><F id="academic_year" label="Academic year (for example 2026-27)" required pattern="\d{4}-\d{2,4}" />
      <F id="class_level" label="Class" defaultValue="10" required /><F id="subject" label="Subject" required /><F id="language" label="Language code (en or hi)" defaultValue="en" />
      <div className="field"><label className="field__label" htmlFor="doc_type">Document type</label><select id="doc_type" name="doc_type" className="field__input">{DOC_TYPES.map((d) => <option key={d} value={d}>{DOC_TYPE_LABEL[d]}</option>)}</select></div>
      <F id="source_url" label="Official source address (if any)" type="url" placeholder="https://" /><F id="source_note" label="Or describe the source (document title, issuing body, year)" /><F id="source_date" label="Source publication or effective date (optional)" type="date" />
      <div className="field"><label className="field__label" htmlFor="file">File</label><input id="file" name="file" type="file" required accept=".pdf,.docx,.xlsx,.csv" /></div>
      {msg && <p className={msg.ok ? undefined : 'alert'} role="status">{msg.text}</p>}
      <button className="btn btn--accent" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
    </form>
  );
}
