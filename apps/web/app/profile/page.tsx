'use client';

import { useEffect, useState } from 'react';

// School + family details and how the student did in classes 6-9 before
// joining Sahayak. Entirely optional and editable any time — this isn't
// part of onboarding and nothing here affects the tutor or diagnostics.
// It exists so the team has real numbers (who's using the app, what grades
// they were getting before) when talking to schools, parents or investors
// later, instead of guessing.

const CLASS_LEVELS = [9, 8, 7, 6] as const;

interface AcademicRow {
  classLevel: number;
  overallPercentage: string;
  board: string;
  remarks: string;
}

function emptyHistory(): Record<number, AcademicRow> {
  const out: Record<number, AcademicRow> = {};
  for (const c of CLASS_LEVELS) out[c] = { classLevel: c, overallPercentage: '', board: '', remarks: '' };
  return out;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState('');

  const [schoolName, setSchoolName] = useState('');
  const [schoolBoard, setSchoolBoard] = useState('CBSE');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolState, setSchoolState] = useState('');

  const [parentName, setParentName] = useState('');
  const [parentRelation, setParentRelation] = useState('');
  const [parentOccupation, setParentOccupation] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [siblingsCount, setSiblingsCount] = useState('');
  const [address, setAddress] = useState('');
  const [howHeardAboutUs, setHowHeardAboutUs] = useState('');

  const [history, setHistory] = useState<Record<number, AcademicRow>>(emptyHistory());

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        const { displayName, grade, details, academicHistory } = json.data;
        setDisplayName(displayName ?? '');
        setGrade(grade ?? '');
        if (details) {
          setSchoolName(details.schoolName ?? '');
          setSchoolBoard(details.schoolBoard ?? 'CBSE');
          setSchoolCity(details.schoolCity ?? '');
          setSchoolState(details.schoolState ?? '');
          setParentName(details.parentName ?? '');
          setParentRelation(details.parentRelation ?? '');
          setParentOccupation(details.parentOccupation ?? '');
          setParentEmail(details.parentEmail ?? '');
          setParentPhone(details.parentPhone ?? '');
          setSiblingsCount(details.siblingsCount != null ? String(details.siblingsCount) : '');
          setAddress(details.address ?? '');
          setHowHeardAboutUs(details.howHeardAboutUs ?? '');
        }
        if (Array.isArray(academicHistory)) {
          setHistory((prev) => {
            const next = { ...prev };
            for (const row of academicHistory) {
              next[row.classLevel] = {
                classLevel: row.classLevel,
                overallPercentage: row.overallPercentage != null ? String(row.overallPercentage) : '',
                board: row.board ?? '',
                remarks: row.remarks ?? '',
              };
            }
            return next;
          });
        }
      })
      .catch((e) => setError(e.message === 'unauthenticated' ? 'Sign in to edit your profile.' : e.message))
      .finally(() => setLoading(false));
  }, []);

  function updateHistory(classLevel: number, field: keyof AcademicRow, value: string) {
    setHistory((prev) => ({ ...prev, [classLevel]: { ...prev[classLevel], [field]: value } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const academicHistory = CLASS_LEVELS.map((c) => ({
        classLevel: c,
        overallPercentage: history[c].overallPercentage.trim() ? Number(history[c].overallPercentage) : null,
        board: history[c].board.trim() || null,
        remarks: history[c].remarks.trim() || null,
      }));

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: {
            schoolName: schoolName.trim() || null,
            schoolBoard: schoolBoard.trim() || null,
            schoolCity: schoolCity.trim() || null,
            schoolState: schoolState.trim() || null,
            parentName: parentName.trim() || null,
            parentRelation: parentRelation.trim() || null,
            parentOccupation: parentOccupation.trim() || null,
            parentEmail: parentEmail.trim() || null,
            parentPhone: parentPhone.trim() || null,
            siblingsCount: siblingsCount.trim() ? Number(siblingsCount) : null,
            address: address.trim() || null,
            howHeardAboutUs: howHeardAboutUs.trim() || null,
          },
          academicHistory,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSaved(true);
    } catch (e: any) {
      setError(e.message ?? 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="shell">
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-4)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell">
        <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Your profile</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{displayName ? `${displayName}'s profile` : 'Your profile'}</h1>
          <p className="hero__lede" style={{ marginBottom: 0 }}>
            A bit more about you and your school — entirely optional, and only visible to you. It helps
            us understand our students better as we keep building Sahayak.
          </p>
        </div>

        {error && <p className="alert" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}

        <form onSubmit={handleSave} style={{ marginTop: 'var(--space-3)' }}>
          <section className="fade-slide-in" style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: 'var(--space-3)', background: 'white', marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>School details</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 2, minWidth: '220px' }}>
                <label className="field__label" htmlFor="schoolName">School name</label>
                <input id="schoolName" className="field__input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. Delhi Public School" />
              </div>
              <div className="field" style={{ flex: 1, minWidth: '140px' }}>
                <label className="field__label" htmlFor="schoolBoard">Board</label>
                <input id="schoolBoard" className="field__input" value={schoolBoard} onChange={(e) => setSchoolBoard(e.target.value)} placeholder="CBSE" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: '160px' }}>
                <label className="field__label" htmlFor="schoolCity">City</label>
                <input id="schoolCity" className="field__input" value={schoolCity} onChange={(e) => setSchoolCity(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: '160px' }}>
                <label className="field__label" htmlFor="schoolState">State</label>
                <input id="schoolState" className="field__input" value={schoolState} onChange={(e) => setSchoolState(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="fade-slide-in" style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: 'var(--space-3)', background: 'white', marginBottom: 'var(--space-3)', animationDelay: '0.05s' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>Family / contact details</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 2, minWidth: '200px' }}>
                <label className="field__label" htmlFor="parentName">Parent / guardian name</label>
                <input id="parentName" className="field__input" value={parentName} onChange={(e) => setParentName(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: '140px' }}>
                <label className="field__label" htmlFor="parentRelation">Relation</label>
                <input id="parentRelation" className="field__input" value={parentRelation} onChange={(e) => setParentRelation(e.target.value)} placeholder="Mother / Father / Guardian" />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="parentOccupation">Parent occupation (optional)</label>
              <input id="parentOccupation" className="field__input" value={parentOccupation} onChange={(e) => setParentOccupation(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                <label className="field__label" htmlFor="parentEmail">Parent email</label>
                <input id="parentEmail" className="field__input" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: '160px' }}>
                <label className="field__label" htmlFor="parentPhone">Parent phone</label>
                <input id="parentPhone" className="field__input" type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
              </div>
              <div className="field" style={{ width: '140px' }}>
                <label className="field__label" htmlFor="siblingsCount">Siblings</label>
                <input id="siblingsCount" className="field__input" type="number" min="0" value={siblingsCount} onChange={(e) => setSiblingsCount(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="address">Address (optional)</label>
              <input id="address" className="field__input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="howHeard">How did you hear about Sahayak?</label>
              <input id="howHeard" className="field__input" value={howHeardAboutUs} onChange={(e) => setHowHeardAboutUs(e.target.value)} placeholder="e.g. a friend, school, social media" />
            </div>
          </section>

          <section className="fade-slide-in" style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: 'var(--space-3)', background: 'white', marginBottom: 'var(--space-3)', animationDelay: '0.1s' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginTop: 0 }}>Academic performance before Class 10</h2>
            <p style={{ color: 'var(--slate)', marginTop: 0 }}>
              Your overall result each year, if you remember it — even a rough number helps. Leave any year blank if you'd rather not say.
            </p>
            {CLASS_LEVELS.map((c) => (
              <div key={c} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                <div style={{ minWidth: '90px', fontWeight: 600, paddingBottom: '0.6rem' }}>Class {c}</div>
                <div className="field" style={{ width: '160px' }}>
                  <label className="field__label" htmlFor={`pct-${c}`}>Overall %</label>
                  <input
                    id={`pct-${c}`}
                    className="field__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={history[c].overallPercentage}
                    onChange={(e) => updateHistory(c, 'overallPercentage', e.target.value)}
                    placeholder="e.g. 88"
                  />
                </div>
                <div className="field" style={{ width: '160px' }}>
                  <label className="field__label" htmlFor={`board-${c}`}>Board / school system</label>
                  <input id={`board-${c}`} className="field__input" value={history[c].board} onChange={(e) => updateHistory(c, 'board', e.target.value)} placeholder="CBSE" />
                </div>
                <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="field__label" htmlFor={`remarks-${c}`}>Notes (optional)</label>
                  <input id={`remarks-${c}`} className="field__input" value={history[c].remarks} onChange={(e) => updateHistory(c, 'remarks', e.target.value)} placeholder="e.g. changed school that year" />
                </div>
              </div>
            ))}
          </section>

          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span style={{ marginLeft: '1rem', color: 'var(--subject-science)', fontWeight: 500 }}>Saved.</span>}
        </form>
      </div>
    </main>
  );
}
