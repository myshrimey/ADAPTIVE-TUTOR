'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SubjectIcon } from '@/components/SubjectIcon';

const PICKABLE_SUBJECT_SLUGS = ['maths', 'science'];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB — plenty for a scanned paper, small enough not to stall on a slow connection

interface SubjectOption {
  id: string;
  slug: string;
  name: string;
}

interface Paper {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  year: number | null;
  filePath: string;
  solutionFilePath: string | null;
  notes: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export default function PreviousPapersPage() {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function loadPapers(subjectId?: string) {
    const url = subjectId && subjectId !== 'all' ? `/api/papers?subjectId=${subjectId}` : '/api/papers';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.error) setPapers(json.data.papers);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));

    Promise.all([fetch('/api/curriculum').then((r) => r.json()), fetch('/api/papers').then((r) => r.json())])
      .then(([curriculumJson, papersJson]) => {
        if (curriculumJson.error) throw new Error(curriculumJson.error);
        const options: SubjectOption[] = (curriculumJson.data?.subjects ?? [])
          .filter((s: any) => PICKABLE_SUBJECT_SLUGS.includes(s.slug))
          .map((s: any) => ({ id: s.id, slug: s.slug, name: s.name }));
        setSubjects(options);
        if (options[0]) setUploadSubjectId(options[0].id);
        if (!papersJson.error) setPapers(papersJson.data.papers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetch('/api/student/profile')
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) setMyStudentId(json.data.studentId);
      })
      .catch(() => {});
  }, []);

  function publicUrl(path: string): string {
    const supabase = createClient();
    return supabase.storage.from('papers').getPublicUrl(path).data.publicUrl;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!paperFile) {
      setUploadError('Choose the question paper file first.');
      return;
    }
    if (paperFile.size > MAX_FILE_BYTES || (solutionFile && solutionFile.size > MAX_FILE_BYTES)) {
      setUploadError('Each file needs to be under 20MB.');
      return;
    }
    const subject = subjects.find((s) => s.id === uploadSubjectId);
    if (!subject) {
      setUploadError('Choose a subject.');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const stamp = Date.now();
      const safeName = (f: File) => f.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      const paperPath = `${subject.slug}/${stamp}-${safeName(paperFile)}`;
      const { error: uploadErr } = await supabase.storage.from('papers').upload(paperPath, paperFile);
      if (uploadErr) throw uploadErr;

      let solutionPath: string | null = null;
      if (solutionFile) {
        solutionPath = `${subject.slug}/${stamp}-solutions-${safeName(solutionFile)}`;
        const { error: solUploadErr } = await supabase.storage.from('papers').upload(solutionPath, solutionFile);
        if (solUploadErr) throw solUploadErr;
      }

      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subject.id,
          title: title.trim() || `${subject.name} paper`,
          year: year ? Number(year) : null,
          filePath: paperPath,
          solutionFilePath: solutionPath,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setTitle('');
      setYear('');
      setNotes('');
      setPaperFile(null);
      setSolutionFile(null);
      setShowUpload(false);
      await loadPapers(filterSubjectId);
    } catch (e: any) {
      setUploadError(e.message === 'unauthenticated' ? 'Sign in to upload a paper.' : e.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this paper from the shared library?')) return;
    const res = await fetch(`/api/papers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.error) setPapers((p) => p.filter((paper) => paper.id !== id));
  }

  const bySubject = new Map<string, Paper[]>();
  for (const p of papers) {
    if (!bySubject.has(p.subjectId)) bySubject.set(p.subjectId, []);
    bySubject.get(p.subjectId)!.push(p);
  }

  return (
    <main className="page">
      <div className="shell">
        <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Previous year papers</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Practice with real past papers</h1>
          <p className="hero__lede" style={{ marginBottom: 0 }}>
            A shared library students add to themselves. Upload a paper you already have — and its
            solutions, if you have those too — or browse what others have shared.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginTop: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => {
                setFilterSubjectId('all');
                loadPapers('all');
              }}
              style={{ background: filterSubjectId === 'all' ? 'var(--ink)' : 'transparent', color: filterSubjectId === 'all' ? 'var(--paper)' : 'var(--ink)', border: '1px solid var(--line)' }}
            >
              All subjects
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn--small"
                onClick={() => {
                  setFilterSubjectId(s.id);
                  loadPapers(s.id);
                }}
                style={{
                  background: filterSubjectId === s.id ? 'var(--ink)' : 'transparent',
                  color: filterSubjectId === s.id ? 'var(--paper)' : 'var(--ink)',
                  border: '1px solid var(--line)',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {signedIn && (
            <button type="button" className="btn btn--accent btn--small" onClick={() => setShowUpload((v) => !v)}>
              {showUpload ? 'Cancel' : 'Upload a paper'}
            </button>
          )}
        </div>

        {!signedIn && !loading && (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-2)' }}>
            <a href="/">Sign in</a> to upload a paper. Browsing is open to everyone.
          </p>
        )}

        {showUpload && (
          <form onSubmit={handleUpload} className="fade-slide-in" style={{ marginTop: 'var(--space-2)', border: '1px solid var(--line)', borderRadius: '10px', padding: 'var(--space-3)', background: 'white' }}>
            {uploadError && <p className="alert">{uploadError}</p>}
            <div className="field">
              <label className="field__label" htmlFor="title">
                Title
              </label>
              <input id="title" className="field__input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2023 Maths Board Paper (Set 1)" />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: '160px' }}>
                <label className="field__label" htmlFor="subject">
                  Subject
                </label>
                <select id="subject" className="field__select" value={uploadSubjectId} onChange={(e) => setUploadSubjectId(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ width: '120px' }}>
                <label className="field__label" htmlFor="year">
                  Year
                </label>
                <input id="year" className="field__input" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2023" min="2000" max="2100" />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="paperFile">
                Question paper (PDF)
              </label>
              <input id="paperFile" type="file" accept="application/pdf" onChange={(e) => setPaperFile(e.target.files?.[0] ?? null)} required />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="solutionFile">
                Solutions (PDF, optional)
              </label>
              <input id="solutionFile" type="file" accept="application/pdf" onChange={(e) => setSolutionFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="notes">
                Notes (optional)
              </label>
              <input id="notes" className="field__input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Compartment exam, Delhi region" />
            </div>
            <button type="submit" className="btn btn--accent" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Add to the library'}
            </button>
          </form>
        )}

        {error && <p className="alert" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>Loading…</p>
        ) : papers.length === 0 ? (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>
            Nothing shared yet{signedIn ? ' — be the first to upload one.' : '.'}
          </p>
        ) : (
          Array.from(bySubject.entries()).map(([subjectId, items], groupIdx) => (
            <section key={subjectId} className="fade-slide-in" style={{ marginTop: 'var(--space-4)', animationDelay: `${groupIdx * 0.06}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <SubjectIcon slug={items[0].subjectName.toLowerCase().includes('science') ? 'science' : 'maths'} size={30} />
                <h2 style={{ fontSize: 'var(--step-1)', margin: 0 }}>{items[0].subjectName}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {items.map((p) => (
                  <div key={p.id} className="chapter-row">
                    <div className="chapter-row__body">
                      <div className="chapter-row__title">
                        {p.title}
                        {p.year ? ` · ${p.year}` : ''}
                      </div>
                      <div className="chapter-row__skills" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <a href={publicUrl(p.filePath)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--marigold-deep)', fontWeight: 500 }}>
                          View paper
                        </a>
                        {p.solutionFilePath && (
                          <a href={publicUrl(p.solutionFilePath)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--subject-science)', fontWeight: 500 }}>
                            View solutions
                          </a>
                        )}
                        {p.notes && <span>{p.notes}</span>}
                        {myStudentId && p.uploadedBy === myStudentId && (
                          <button type="button" onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--foundation)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
